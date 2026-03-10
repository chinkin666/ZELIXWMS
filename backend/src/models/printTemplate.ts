import mongoose from 'mongoose';
import type { TransformPipeline } from '@/transforms/types';

export type PrintTemplateElement = Record<string, any>;

export interface PrintTemplateBinding {
  /** Variable name that can be referenced by template engine. */
  name: string;
  /** Pipeline to derive the value from an input context (order/carrier raw row). */
  pipeline: TransformPipeline;
}

export interface PrintTemplateDocument {
  id: string;
  tenantId: string;
  schemaVersion: number;
  name: string;
  canvas: { widthMm: number; heightMm: number; pxPerMm: number };
  elements: PrintTemplateElement[];
  bindings?: PrintTemplateBinding[];
  meta?: Record<string, any>;
  /** Sample data for visual editor (JSON array, first row is headers, rest are data rows) */
  sampleData?: Record<string, any>[];
  /** Whether to include Yamato sort code (仕分けコード) field with fixed value 999999 */
  requiresYamatoSortCode?: boolean;
  /** Reference background image for visual editor (base64 encoded, only included when includeSampleData=true) */
  referenceImageData?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePrintTemplateDto {
  schemaVersion?: number;
  name: string;
  canvas: { widthMm: number; heightMm: number; pxPerMm: number };
  elements: PrintTemplateElement[];
  bindings?: PrintTemplateBinding[];
  meta?: Record<string, any>;
  /** Sample data for visual editor (JSON array, first row is headers, rest are data rows) */
  sampleData?: Record<string, any>[];
  /** Whether to include Yamato sort code (仕分けコード) field with fixed value 999999 */
  requiresYamatoSortCode?: boolean;
  /** Reference background image for visual editor (base64 encoded, only included when includeSampleData=true) */
  referenceImageData?: string;
}

export interface UpdatePrintTemplateDto {
  schemaVersion?: number;
  name?: string;
  canvas?: { widthMm?: number; heightMm?: number; pxPerMm?: number };
  elements?: PrintTemplateElement[];
  bindings?: PrintTemplateBinding[];
  meta?: Record<string, any>;
  /** Sample data for visual editor (JSON array, first row is headers, rest are data rows) */
  sampleData?: Record<string, any>[];
  /** Whether to include Yamato sort code (仕分けコード) field with fixed value 999999 */
  requiresYamatoSortCode?: boolean;
  /** Reference background image for visual editor (base64 encoded, only included when includeSampleData=true) */
  referenceImageData?: string;
}

export interface IPrintTemplate {
  _id: mongoose.Types.ObjectId;
  tenantId: string;
  schemaVersion: number;
  name: string;
  canvas: { widthMm: number; heightMm: number; pxPerMm: number };
  elements: PrintTemplateElement[];
  bindings?: PrintTemplateBinding[];
  meta?: Record<string, any>;
  /** Sample data for visual editor (JSON array, first row is headers, rest are data rows) */
  sampleData?: Record<string, any>[];
  /** Whether to include Yamato sort code (仕分けコード) field with fixed value 999999 */
  requiresYamatoSortCode?: boolean;
  /** Reference background image for visual editor (base64 encoded, only included when includeSampleData=true) */
  referenceImageData?: string;
  createdAt: Date;
  updatedAt: Date;
}

const bindingSchema = new mongoose.Schema<PrintTemplateBinding>(
  {
    name: { type: String, required: true, trim: true },
    pipeline: { type: mongoose.Schema.Types.Mixed, required: true },
  },
  { _id: false },
);

const printTemplateSchema = new mongoose.Schema<IPrintTemplate>(
  {
    tenantId: { type: String, required: true, index: true, trim: true },
    name: { type: String, required: true, trim: true, index: true },
    schemaVersion: { type: Number, default: 1 },
    canvas: {
      widthMm: { type: Number, required: true },
      heightMm: { type: Number, required: true },
      pxPerMm: { type: Number, required: true },
    },
    elements: { type: [mongoose.Schema.Types.Mixed] as any, required: true, default: [] },
    bindings: { type: [bindingSchema], default: undefined },
    meta: { type: mongoose.Schema.Types.Mixed },
    sampleData: { type: [mongoose.Schema.Types.Mixed] as any, default: undefined },
    requiresYamatoSortCode: { type: Boolean, default: false },
    referenceImageData: { type: String, default: undefined },
  },
  { timestamps: true, collection: 'print_templates' },
);

export const PrintTemplate = mongoose.model<IPrintTemplate>('PrintTemplate', printTemplateSchema);


