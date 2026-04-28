export type SignalType = 'finding' | 'recommendation' | 'action' | 'statement';

export interface Span {
  start: number;
  end: number;
}

export interface Signal {
  type: SignalType;
  text: string;
  rationale: string;
  confidence: number;
  speaker?: string;
}

export interface LocatedSignal extends Signal {
  span: Span;
  matchQuality: 'exact' | 'fuzzy' | 'substring';
}

export interface ExtractionResult {
  documentId: string;
  signals: LocatedSignal[];
  unlocatedSignals: Signal[];
  stats: {
    chunks: number;
    totalExtracted: number;
    located: number;
    dropped: number;
    deduped: number;
  };
}

export interface Chunk {
  index: number;
  start: number;
  end: number;
  text: string;
}
