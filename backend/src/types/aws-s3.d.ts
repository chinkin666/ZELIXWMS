// @aws-sdk/client-s3 の型宣言（未インストール時のビルド通過用）
// @aws-sdk/client-s3 类型声明（未安装时确保编译通过）
declare module '@aws-sdk/client-s3' {
  export class S3Client {
    constructor(config: any);
    send(command: any): Promise<any>;
  }
  export class PutObjectCommand {
    constructor(input: any);
  }
  export class DeleteObjectCommand {
    constructor(input: any);
  }
}
