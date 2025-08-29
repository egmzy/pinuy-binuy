import { NextRequest, NextResponse } from 'next/server'

interface PlanFeature {
  attributes?: {
    pl_name?: string
    pl_number?: string
  }
}

async function searchForPinuyBinuy(gushnumber: number, parcelnumber: number) {
  try {
    // Get parcel geometry for planning search
    const geometryResponse = await fetch(`https://open.govmap.gov.il/geoserver/opendata/wfs?SERVICE=WFS&REQUEST=GetFeature&typeName=Parcels_ITM&VERSION=2.0.0&outputFormat=json&resultType=results&propertyName=GUSH_NUM%2CGUSH_SUFFI%2CPARCEL%2Cthe_geom&cql_filter=PARCEL%20%3D%20${parcelnumber}%20AND%20GUSH_NUM%20%3D%20${gushnumber}%20AND%20GUSH_SUFFI%20%3D%200`, {
      headers: {
        'Accept': '*/*',
        'Accept-Language': 'he-IL,he;q=0.9,en-US;q=0.8,en;q=0.7',
        'Connection': 'keep-alive',
        'Origin': 'https://ags.iplan.gov.il',
        'Referer': 'https://ags.iplan.gov.il/',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36'
      }
    })

    if (!geometryResponse.ok) {
      return { planCheckError: 'Failed to get geometry' }
    }

    const geometryData = await geometryResponse.json()
    
    if (!geometryData.features || geometryData.features.length === 0) {
      return { planCheckError: 'No geometry found' }
    }

    // Calculate center point from polygon coordinates
    const feature = geometryData.features[0]
    const coordinates = feature.geometry.coordinates[0][0]
    
    let sumX = 0
    let sumY = 0
    const numPoints = coordinates.length - 1
    
    for (let i = 0; i < numPoints; i++) {
      sumX += coordinates[i][0]
      sumY += coordinates[i][1]
    }
    
    const x = sumX / numPoints
    const y = sumY / numPoints

    // Query planning data using the geometry point
    const planningResponse = await fetch(`https://ags.iplan.gov.il/arcgisiplan/rest/services/PlanningPublic/xplan_without_77_78/MapServer/1/query?f=json&where=&returnGeometry=true&spatialRel=esriSpatialRelIntersects&geometry=%7B%22x%22%3A${x}%2C%22y%22%3A${y}%2C%22spatialReference%22%3A%7B%22wkid%22%3A2039%7D%7D&geometryType=esriGeometryPoint&inSR=2039&outFields=pl_number%2Cpl_name%2Cpl_url%2Cpl_area_dunam%2Cquantity_delta_120%2Cstation_desc%2Cinternet_short_status%2Cpl_date_advertise%2Cpl_date_8%2Cplan_county_name%2Cpl_landuse_string&orderByFields=pl_number&outSR=2039`, {
      headers: {
        'Accept': '*/*',
        'Accept-Language': 'he-IL,he;q=0.9,en-US;q=0.8,en;q=0.7',
        'Connection': 'keep-alive',
        'Referer': 'https://ags.iplan.gov.il/xplan/',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36'
      }
    })

    if (planningResponse.ok) {
      const planningData = await planningResponse.json()
      
      if (planningData.features && planningData.features.length > 0) {
        for (const planFeature of planningData.features) {
          const attributes = planFeature.attributes
          if (attributes && attributes.pl_name && attributes.pl_name.includes('פינוי בינוי')) {
            return { planNumber: attributes.pl_number }
          }
        }
      }
    }
    
    return { planCheckError: 'לא נמצאה תוכנית' }
  } catch (error) {
    console.error('Error searching for pinuy binuy:', error)
    return { planCheckError: 'שגיאה בחיפוש תוכניות' }
  }
}

export async function POST(request: NextRequest) {
  try {
    const { address, step, gushnumber, parcelnumber, planNumber } = await request.json()
    
    // Handle different steps
    if (step === 'url') {
      // Step 3: Just return the URL for the plan number
      if (!planNumber) {
        return NextResponse.json({ error: 'Plan number is required' }, { status: 400 })
      }
      const planUrl = `https://mavat.iplan.gov.il/SV3?text=${encodeURIComponent(planNumber)}`
      return NextResponse.json({ planUrl })
    }

    if (step === 'planning') {
      // Step 2: Search for planning data using provided gush/helka
      if (!gushnumber || !parcelnumber) {
        return NextResponse.json({ error: 'Gush and parcel numbers are required' }, { status: 400 })
      }
      
      const planningResult = await searchForPinuyBinuy(gushnumber, parcelnumber)
      return NextResponse.json(planningResult)
    }
    
    if (!address) {
      return NextResponse.json({ error: 'Address is required' }, { status: 400 })
    }

    // Step 1: Search for address on govmap
    const searchResponse = await fetch('https://www.govmap.gov.il/api/search-service/autocomplete', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'accept-language': 'he-IL,he;q=0.9,en-US;q=0.8,en;q=0.7',
        'content-type': 'application/json',
        'origin': 'https://www.govmap.gov.il',
        'referer': 'https://www.govmap.gov.il/',
        'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36'
      },
      body: JSON.stringify({
        "searchText": address,
        "language": "he",
        "isAccurate": false,
        "maxResults": 10
      })
    })

    if (!searchResponse.ok) {
      return NextResponse.json({ error: 'Failed to search address' }, { status: 500 })
    }

    const searchData = await searchResponse.json()
    
    if (!searchData.results || searchData.results.length === 0) {
      return NextResponse.json({ error: 'לא נמצאה כתובת' }, { status: 404 })
    }

    // Extract coordinates from the first result
    const firstResult = searchData.results[0]
    const shape = firstResult.shape
    
    // Extract coordinates from shape string like "POINT(3894312.645359459 3871812.2729069265)"
    const coordinateMatch = shape.match(/POINT\(([0-9.]+)\s+([0-9.]+)\)/)
    
    if (!coordinateMatch) {
      return NextResponse.json({ error: 'Invalid coordinates format' }, { status: 500 })
    }

    const [, searchX, searchY] = coordinateMatch
    const searchCoordinates = `${searchX} ${searchY}`

    // Step 2: Get parcel information using coordinates
    const parcelResponse = await fetch(`https://www.govmap.gov.il/api/layers-catalog/apps/parcel-search/address/(${encodeURIComponent(searchCoordinates)})`, {
      headers: {
        'accept': 'application/json, text/plain, */*',
        'accept-language': 'he-IL,he;q=0.9,en-US;q=0.8,en;q=0.7',
        'referer': 'https://www.govmap.gov.il/',
        'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36'
      }
    })

    if (!parcelResponse.ok) {
      return NextResponse.json({ error: 'Failed to get parcel information' }, { status: 500 })
    }

    const parcelData = await parcelResponse.json()
    
    if (!parcelData.properties) {
      return NextResponse.json({ error: 'לא נמצאה כתובת' }, { status: 404 })
    }

    const { objectid, gushnumber: foundGush, parcelnumber: foundParcel } = parcelData.properties

    return NextResponse.json({
      success: true,
      objectid,
      gushnumber: foundGush,
      parcelnumber: foundParcel,
      address: firstResult.text
    })

  } catch (error) {
    console.error('Search error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}