# AI Pipeline

## 方針

**AI に決めさせるのは「理由の言葉」だけで、「何を勧めるか」は店のデータが決める。**

理由は3つ。

1. その店に無い生地を勧めてしまうと、店頭で最悪の体験になる
2. AI が落ちても提案が出せる（実際、文章生成が未接続でも提案は出る）
3. 原価が読める

```
顧客プロフィール ┐
購入履歴        ├→ [相性の採点ルール] → 上位3点 → [Claude] → 理由の日本語
生地台帳(在庫)  │      （純粋関数）                          （落ちたらルールの要約）
店舗ノウハウ    ┘
```

## 1. 試着生成（画像）

### 入力

| | |
|---|---|
| IMAGE 1 | 顧客写真（そのまま。加工しない） |
| IMAGE 2 | **その店の生地の実物写真**（必ず渡す） |
| テキスト | 撮影指示書（`src/lib/ai/tryOnPrompt.ts`） |

### 撮影指示書の2本の柱

**(a) 人を変えない**

```
Keep the person from IMAGE 1 exactly as they are: same face, same facial features
and proportions, same hairstyle, same skin tone, same apparent age, same body build
and shoulder width, same posture.
Keep the same camera angle, framing, background, lighting direction and colour temperature.
Do NOT beautify, slim, de-age, whiten, or restyle the person.
Do NOT produce a lookalike. It is the same individual.
Change ONLY the clothing.
```

美化・痩身・若返りを明示的に禁止しているのは、**お客様が「これ自分じゃない」と感じた瞬間に商談が終わる**から。

**(b) 生地を言葉で作らせない**

```
The suit must be made of the exact fabric in IMAGE 2.
Match the colour, the weave pattern, the SCALE of the pattern, the sheen and the
surface texture to IMAGE 2.
Do not substitute a similar colour. Do not invent a pattern that is not in IMAGE 2.
Render the weave at realistic garment scale.
For reference, the store describes this fabric as: <台帳の情報>.
The IMAGE takes priority over these words.
```

台帳の文字情報（色名・混率・目付・光沢）は**画像を補うため**に渡す。画像の代わりにはしない。生地写真が無い生地では `usedFabricReference = false` になり、画面に「生地画像なし」と赤字で出る。黙って作らない。

詳しくは [FABRIC_ACCURACY.md](./FABRIC_ACCURACY.md)。

### 実測（2026-09-08 / gemini-3.1-flash-image）

| | |
|---|---|
| 所要時間 | 10.6〜13.1 秒（4回の実測） |
| 入力トークン | 977〜985 |
| 出力トークン | 1,369〜1,440 |
| 原価 | ¥12.8〜13.5 / 枚 |
| 成功率 | 4 / 4 |

## 2. AI スタイリスト（文章）

### 採点ルール（`src/lib/domain/stylist.ts`）

50点から始めて加減する。**汎用 AI が絶対に持っていない情報**にだけ大きな重みを置いている。

| 要素 | 点 | なぜ |
|---|---|---|
| 取り扱い終了 | −100 | 候補から消す |
| 在庫切れ | −40 | 「今ありません」は最悪の接客 |
| 季節が合う / 逆 | +12 / −10 | 今月から自動判定（3〜8月=春夏） |
| 用途に合う色 | +12 | 式典に柄物は −12 |
| **同じ生地を購入済み** | **−35** | 台帳がないと分からない |
| **同系色をお持ち** | **−18** | 「次の1着」の核 |
| **お手持ちと重ならない** | **+10** | 同上 |
| お好みの色 | +10 | |
| 好みのスタイルに合う柄 | +8 | |
| 肌の色となじむ | +6 | 加点のみ。減点はしない |
| 体型と柄 | ±6〜8 | 大柄は体格を強調する |
| 予算帯が近い / 上 | +8 / −10 | 過去の平均購入額から |
| **店舗ノウハウに合致** | **+12** | その店だけの勘所 |

条件のないノウハウは**加点しない**（全件に同じ点が乗ると順位が動かず意味がないため）。

### 理由づけ

上位3点だけを Claude Haiku 4.5 に渡し、1案あたり日本語 60〜90 字で書かせる。

- 渡すのは「候補名・色・柄・**加点された事実**」だけ。価格や在庫を発明させない
- 「AIが」「システムが」とは書かせない（お客様に見せる言葉なので）
- JSON 配列以外が返ったら**採用しない**。ルールの要約に落とす
- 実測: 3.8〜3.9 秒 / 入力 590 tok / 出力 277〜286 tok / **¥0.31**

### AI が使えないときの表示

画面のバッジが「AI が理由づけ」→「相性ルールによる要約」に変わる。**理由の出どころを偽らない。** `npm run check:fake-ai` がこの分岐の存在を見張っている。

## 3. プロバイダの差し替え

```ts
// src/lib/ai/providers/index.ts
const IMAGE_FACTORIES = {
  gemini: () => createGeminiImageProvider(),
  // 新しい会社はここに1行足して providers/<name>.ts を書くだけ
};
```

環境変数 `SUITS_IMAGE_PROVIDER` で切り替わる。`ImageProvider` が要求するのは

```ts
estimateJpy(): number
generateTryOn(input): Promise<TryOnResult>   // 原価・時間・トークンを必ず返す
```

の2つだけなので、価格・品質・速度で乗り換えられる。**1社に固定していない。**

## 4. 原価の記録（例外なし）

`generateTryOn` は成功でも失敗でも `ai_jobs` に1行残す。失敗しても呼んだ分の原価は発生しうるので、`0` と書かずに分かる範囲で記録する。

料金表に無いモデルの原価は **`null`（不明）** を返す。`0` にしない。

## 5. 上限

サーバー側で、生成の**前**に見る。

- 今月の成功した試着回数 < プランの上限
- 今月の AI 原価 < 上限額

どちらかに達したら生成しない。**無制限のプランは作らない。**
（失敗した生成は回数に数えない。お客様の目の前で失敗した分まで枠を削らないため。原価は発生した分を数える）
