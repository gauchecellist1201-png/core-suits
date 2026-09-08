import type { GarmentSpec } from "@/lib/domain/types";

export interface TryOnInput {
  /** 顧客写真（そのまま渡す。顔・体格・背景を維持させる基準） */
  customerPhoto: { bytes: Buffer; mime: string };
  /**
   * 生地の実物画像。★必ず渡す。
   * 文字プロンプトだけで生地を作らせない（色・柄・光沢が別物になるため）。
   */
  fabricImage?: { bytes: Buffer; mime: string };
  /** 生地の台帳情報（画像を補う言葉。画像の代わりではない） */
  fabricDescription: string;
  garment: GarmentSpec;
}

export interface TryOnResult {
  ok: boolean;
  image?: { bytes: Buffer; mime: string };
  errorMessage?: string;
  provider: string;
  model: string;
  latencyMs: number;
  inputTokens?: number;
  outputTokens?: number;
  /** 実測トークンから出した円。トークンが取れないときは見積りを入れる */
  costJpy: number;
  /** 生地画像を実際に渡せたか。false のときは UI で色の注意を強める */
  usedFabricReference: boolean;
}

export interface ImageProvider {
  readonly name: string;
  readonly model: string;
  /** 生成前に画面へ出す見積り（円） */
  estimateJpy(): number;
  generateTryOn(input: TryOnInput): Promise<TryOnResult>;
}

export interface TextResult {
  ok: boolean;
  text: string;
  errorMessage?: string;
  provider: string;
  model: string;
  latencyMs: number;
  inputTokens: number;
  outputTokens: number;
  costJpy: number;
}

export interface TextProvider {
  readonly name: string;
  readonly model: string;
  complete(system: string, user: string, maxTokens: number): Promise<TextResult>;
}
