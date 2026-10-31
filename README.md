This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Importing vocabulary

TXT, CSV, text-based PDF, DOCX, and DOC files can be imported. The importer recognizes common English, Chinese meaning, and synonym column names even when the columns are reordered or a directory column is present. It previews the recognized entries before saving them. Check the preview and cancel if the file needs correction. Scanned PDFs need OCR first.

In the vocabulary library, choose **编辑** on a day to move its words to another day number or delete the entire day. Moving to an existing day merges the groups. Deleting a day also removes its study records and shifts later day numbers down by one.

In test mode, answer matching ignores letter case, spaces, apostrophes, and hyphens. Press Enter to submit, then Enter again for the next word. The progress counter shows distinct words mastered in the current test; a missed word must be answered correctly three times in its retry rounds before it counts. The completion dialog appears once every word in the selected list is mastered. Completing the "today" list records today's check-in.

The importer keeps phonetic transcriptions from a phonetic column or inline `/.../` and `[...]` notation. Previously imported words without stored phonetics can be filled in from the library's phonetic column.

Daily check-ins use the China calendar date. When the home page opens, it restores a missing 20-energy check-in if today's latest vocabulary list has complete, correct test records; an existing check-in is never awarded twice.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
