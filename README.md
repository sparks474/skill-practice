# skill-practice

FF14 機工士（MCH）のキーマウスキル回し練習ツールです。

## 遊ぶ

GitHub Pages:

**https://sparks474.github.io/skill-practice/**

`main` への push で自動デプロイされます。404 のときは [Actions](https://github.com/sparks474/skill-practice/actions) の最新「Deploy GitHub Pages」が成功しているか確認し、失敗していれば **Re-run all jobs** してください。

初回のみ Settings → Pages → Source を **GitHub Actions** にします。

## ローカル開発

アプリ本体は [`ff14-mch-practice/`](./ff14-mch-practice/) にあります。

```bash
cd ff14-mch-practice
npm install
npm run dev
```

設計書: [`ff14-mch-practice/DESIGN.md`](./ff14-mch-practice/DESIGN.md)
