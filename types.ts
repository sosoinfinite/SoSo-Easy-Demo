
export interface Message {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: number;
}

export interface CallSummary {
  name: string;
  vehicle: string;
  location: string;
}

export interface FloatAnimation {
  id: string;
  x: number;
  type: 'money' | 'zzz';
}
