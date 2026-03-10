export interface OrderSourceCompany {
  _id: string;
  senderName: string;
  senderPostalCode: string;
  senderAddressPrefecture?: string; // 都道府県
  senderAddressCity?: string; // 郡市区
  senderAddressStreet?: string; // それ以降の住所
  senderPhone: string;
  /** 発店コード1（3桁数字、任意） */
  hatsuBaseNo1?: string;
  /** 発店コード2（3桁数字、任意） */
  hatsuBaseNo2?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrderSourceCompanyFilters {
  senderName?: string;
  senderPostalCode?: string;
  senderPhone?: string;
}

export interface UpsertOrderSourceCompanyDto {
  senderName: string;
  senderPostalCode: string;
  senderAddressPrefecture?: string; // 都道府県
  senderAddressCity?: string; // 郡市区
  senderAddressStreet?: string; // それ以降の住所
  senderPhone: string;
  hatsuBaseNo1?: string;
  hatsuBaseNo2?: string;
}

