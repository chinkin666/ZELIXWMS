import mongoose from 'mongoose';

interface ISequence {
  _id: string;
  seq: number;
}

const sequenceSchema = new mongoose.Schema<ISequence>({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 },
});

const Sequence = mongoose.model<ISequence>('Sequence', sequenceSchema);

/**
 * 生成自动递增编号。
 * @param prefix 前缀 (例: "MV", "IN")
 * @param digits 数字位数 (默认 5)
 * @returns 例: "MV-20260312-00001"
 */
export async function generateSequenceNumber(prefix: string, digits = 5): Promise<string> {
  const today = new Date();
  const dateStr = [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, '0'),
    String(today.getDate()).padStart(2, '0'),
  ].join('');

  const seqKey = `${prefix}-${dateStr}`;

  const result = await Sequence.findOneAndUpdate(
    { _id: seqKey },
    { $inc: { seq: 1 } },
    { upsert: true, returnDocument: 'after' },
  );

  const num = String(result.seq).padStart(digits, '0');
  return `${prefix}-${dateStr}-${num}`;
}
