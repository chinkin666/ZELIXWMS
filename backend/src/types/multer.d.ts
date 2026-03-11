declare module 'multer' {
  import type { Request } from 'express';

  interface StorageEngine {
    _handleFile(
      req: Request,
      file: Express.Multer.File,
      callback: (error?: Error | null, info?: Partial<Express.Multer.File>) => void,
    ): void;
    _removeFile(req: Request, file: Express.Multer.File, callback: (error: Error | null) => void): void;
  }

  interface Options {
    dest?: string;
    storage?: StorageEngine;
    limits?: {
      fieldNameSize?: number;
      fieldSize?: number;
      fields?: number;
      fileSize?: number;
      files?: number;
      headerPairs?: number;
      parts?: number;
    };
    fileFilter?: (
      req: Request,
      file: Express.Multer.File,
      callback: (error: Error | null, acceptFile: boolean) => void,
    ) => void;
  }

  interface MulterInstance {
    single(fieldName: string): (req: Request, res: any, next: any) => void;
    array(fieldName: string, maxCount?: number): (req: Request, res: any, next: any) => void;
    fields(fields: Array<{ name: string; maxCount?: number }>): (req: Request, res: any, next: any) => void;
    none(): (req: Request, res: any, next: any) => void;
    any(): (req: Request, res: any, next: any) => void;
  }

  function multer(options?: Options): MulterInstance;

  namespace multer {
    function memoryStorage(): StorageEngine;
    function diskStorage(options: {
      destination?: string | ((req: Request, file: Express.Multer.File, cb: (error: Error | null, destination: string) => void) => void);
      filename?: (req: Request, file: Express.Multer.File, cb: (error: Error | null, filename: string) => void) => void;
    }): StorageEngine;
  }

  export = multer;
}

declare namespace Express {
  namespace Multer {
    interface File {
      fieldname: string;
      originalname: string;
      encoding: string;
      mimetype: string;
      size: number;
      destination: string;
      filename: string;
      path: string;
      buffer: Buffer;
    }
  }
}



