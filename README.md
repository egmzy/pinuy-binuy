# Israeli Urban Renewal Address Checker
A simple web tool to check if an Israeli address has an approved urban renewal plan.

<img width="784" height="496" alt="image" src="https://github.com/user-attachments/assets/16391a86-8f8b-4e98-868a-0b9a98e37925" />

### [Demo](https://pinuy-binuy.netlify.app)


## What it does

Enter any Israeli address and get:
- Gush and Helka numbers for the property
- Whether a פינוי בינוי plan exists
- Direct link to view plan details on Mavat

## How to run

```bash
npm install
npm run dev
```

Open http://localhost:3000

## How it works

1. Searches address using GovMap API
2. Gets parcel geometry data  
3. Queries planning database for פינוי בינוי plans
4. Links to official Mavat planning system

## Tech stack

- Next.js 15
- TypeScript
- Tailwind CSS
- Israeli government APIs (GovMap, Planning DB, Mavat)

## Note

This is a free tool for informational purposes only. Always verify information with official sources.
