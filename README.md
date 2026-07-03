# V Board Sprint20 RC2

Vercel設定は以下でOKです。

- Build Command: `npm run build`
- Output Directory: `public`
- Install Command: 空欄またはデフォルト

今回のZIPは `package.json` の build で `public` を自動生成するため、Vercelの `public directory missing` エラーを避けます。
