import { Pai, Block } from './types';
import { Result } from './definition';

export interface MistakeRecord {
  hand: Pai[];
  agariPai: Pai;
  furo: Block[];
  dora: Pai[];
  ura: Pai[];
  userAnswer: string;
  correctAnswer: Result;
  info: string;
  timestamp: number;
}

class MistakeStore {
  private mistakes: MistakeRecord[] = [];
  
  add(mistake: Omit<MistakeRecord, 'timestamp'>) {
    this.mistakes.push({
      ...mistake,
      timestamp: Date.now()
    });
  }
  
  getAll() {
    return [...this.mistakes].sort((a, b) => b.timestamp - a.timestamp);
  }
  
  remove(index: number) {
    this.mistakes.splice(index, 1);
  }
  
  clear() {
    this.mistakes = [];
  }

  toJSON() {
    return JSON.stringify(this.mistakes);
  }

  fromJSON(json: string) {
    try {
      this.mistakes = JSON.parse(json);
    } catch (e) {
      console.error('导入历史记录失败', e);
    }
  }
}

export default new MistakeStore();