/**
 * 顧客ポータル認証 / 客户门户认证
 *
 * 客户用户登录 + 客户用户创建（仓库端邀请）
 */
import type { Request, Response } from 'express';
import { User } from '@/models/user';
import { Client } from '@/models/client';
import { SubClient } from '@/models/subClient';
import { generateToken } from '@/api/middleware/auth';
import { logger } from '@/lib/logger';

/**
 * POST /api/portal/auth/login
 * 顧客ポータルログイン / 客户门户登录
 */
export async function portalLogin(req: Request, res: Response): Promise<void> {
  try {
    const { email, password, tenantId = 'default' } = req.body;

    if (!email || !password) {
      res.status(400).json({ message: 'メールアドレスとパスワードは必須です / 邮箱和密码必填' });
      return;
    }

    const user = await User.findOne({
      email: email.toLowerCase().trim(),
      tenantId,
      role: 'client', // 只允许客户角色登录门户 / クライアントロールのみ
    });

    if (!user || !user.isActive) {
      res.status(401).json({ message: 'メールアドレスまたはパスワードが正しくありません / 邮箱或密码错误' });
      return;
    }

    const isValid = User.verifyPassword(password, user.passwordHash);
    if (!isValid) {
      res.status(401).json({ message: 'メールアドレスまたはパスワードが正しくありません / 邮箱或密码错误' });
      return;
    }

    await User.updateOne({ _id: user._id }, { $set: { lastLoginAt: new Date() }, $inc: { loginCount: 1 } });

    // 顧客情報を取得 / 获取客户信息
    const client = user.clientId ? await Client.findById(user.clientId).lean() : null;

    // subClientId を取得（もしあれば）/ 获取 subClientId
    let subClientId: string | undefined;
    if (user.parentUserId) {
      // 子客户ユーザーの場合、SubClient を検索 / 子客户用户时查找 SubClient
      const subClient = await SubClient.findOne({ portalUserId: user._id }).lean();
      subClientId = subClient?._id?.toString();
    }

    const token = generateToken({
      id: user._id.toString(),
      email: user.email,
      tenantId: user.tenantId,
      role: user.role,
      displayName: user.displayName,
      clientId: user.clientId?.toString(),
    });

    logger.info({ userId: user._id, email: user.email }, 'Portal user logged in / ポータルユーザーログイン');

    res.json({
      token,
      user: {
        id: user._id.toString(),
        email: user.email,
        displayName: user.displayName,
        role: user.role,
        clientId: user.clientId?.toString() || '',
        clientName: client?.name || user.clientName || '',
        subClientId,
        language: user.language || client?.portalLanguage || 'ja',
      },
    });
  } catch (err) {
    logger.error({ err }, 'Portal login failed / ポータルログイン失敗');
    res.status(500).json({ message: 'Internal server error' });
  }
}

/**
 * POST /api/portal/auth/invite
 * 顧客ユーザー招待（仓库端/平台端から呼び出し）/ 客户用户邀请
 */
export async function invitePortalUser(req: Request, res: Response): Promise<void> {
  try {
    const tenantId = req.headers['x-tenant-id'] as string || 'default';
    const { email, displayName, password, clientId, subClientId } = req.body;

    if (!email || !password || !clientId) {
      res.status(400).json({ message: 'email, password, clientId は必須です / 必填' });
      return;
    }

    // 顧客存在確認 / 客户存在校验
    const client = await Client.findById(clientId).lean();
    if (!client) {
      res.status(404).json({ message: '顧客が見つかりません / 客户不存在' });
      return;
    }

    // メール重複チェック / 邮箱重复校验
    const existing = await User.findOne({ email: email.toLowerCase().trim(), tenantId });
    if (existing) {
      res.status(409).json({ message: 'このメールアドレスは既に使用されています / 邮箱已被使用' });
      return;
    }

    const passwordHash = User.hashPassword(password);

    const user = await User.create({
      tenantId,
      email: email.toLowerCase().trim(),
      passwordHash,
      displayName: displayName || email.split('@')[0],
      role: 'client',
      clientId,
      clientName: client.name,
      language: client.portalLanguage || 'ja',
      isActive: true,
      loginCount: 0,
    });

    // SubClient に portalUserId を紐付け / 关联 SubClient 的 portalUserId
    if (subClientId) {
      await SubClient.findByIdAndUpdate(subClientId, { portalEnabled: true, portalUserId: user._id });
    }

    // Client の portalEnabled を有効化 / 启用客户门户
    await Client.findByIdAndUpdate(clientId, { portalEnabled: true });

    logger.info({ userId: user._id, clientId }, 'Portal user created / ポータルユーザー作成');

    res.status(201).json({
      id: user._id.toString(),
      email: user.email,
      displayName: user.displayName,
      clientId: user.clientId?.toString(),
    });
  } catch (err) {
    logger.error({ err }, 'Portal user invite failed / ポータルユーザー招待失敗');
    res.status(500).json({ message: 'Internal server error' });
  }
}
