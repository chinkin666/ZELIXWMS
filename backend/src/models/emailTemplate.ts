import mongoose from 'mongoose';

export interface IEmailTemplate {
  _id: mongoose.Types.ObjectId;
  /** テンプレート表示名 */
  name: string;
  /** 配送業者ID（null = 全配送業者共通） */
  carrierId?: mongoose.Types.ObjectId | null;
  /** 配送業者名（非正規化） */
  carrierName?: string;
  /** 有効/無効 */
  isActive: boolean;
  /** 発送元名 */
  senderName: string;
  /** 送信元メールアドレス */
  senderEmail: string;
  /** 返信先メールアドレス */
  replyToEmail?: string;
  /** メールタイトル（プレースホルダー対応） */
  subject: string;
  /** メール本文テンプレート（プレースホルダー対応） */
  bodyTemplate: string;
  /** フッターテキスト */
  footerText?: string;
  /** デフォルトテンプレートフラグ */
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const emailTemplateSchema = new mongoose.Schema<IEmailTemplate>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    carrierId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Carrier',
      default: null,
    },
    carrierName: {
      type: String,
      trim: true,
      default: '',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    senderName: {
      type: String,
      required: true,
      trim: true,
    },
    senderEmail: {
      type: String,
      required: true,
      trim: true,
    },
    replyToEmail: {
      type: String,
      trim: true,
      default: '',
    },
    subject: {
      type: String,
      required: true,
      trim: true,
    },
    bodyTemplate: {
      type: String,
      required: true,
    },
    footerText: {
      type: String,
      default: '',
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    collection: 'email_templates',
  },
);

emailTemplateSchema.index({ carrierId: 1 });
emailTemplateSchema.index({ isDefault: 1 });
emailTemplateSchema.index({ isActive: 1 });

export const EmailTemplate = mongoose.model<IEmailTemplate>('EmailTemplate', emailTemplateSchema);
