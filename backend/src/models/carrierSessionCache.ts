import mongoose from 'mongoose';

/**
 * 配送会社APIセッションキャッシュ
 * 各キャリアのAPIセッショントークンをMongoDB上でキャッシュする。
 * TTLインデックスにより期限切れトークンは自動削除される。
 */
export interface ICarrierSessionCache {
  _id: mongoose.Types.ObjectId;
  tenantId: string;
  carrierType: string; // 'yamato-b2', 'sagawa-api', etc.
  sessionToken: string;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const carrierSessionCacheSchema = new mongoose.Schema<ICarrierSessionCache>(
  {
    tenantId: {
      type: String,
      required: true,
      trim: true,
    },
    carrierType: {
      type: String,
      required: true,
      trim: true,
    },
    sessionToken: {
      type: String,
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
    collection: 'carrier_session_caches',
  },
);

// テナント + キャリアタイプで一意
carrierSessionCacheSchema.index({ tenantId: 1, carrierType: 1 }, { unique: true });

// TTLインデックス: expiresAt を過ぎたドキュメントを自動削除
carrierSessionCacheSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const CarrierSessionCache = mongoose.model<ICarrierSessionCache>(
  'CarrierSessionCache',
  carrierSessionCacheSchema,
);
