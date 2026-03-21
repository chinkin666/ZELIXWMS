import type { Request, Response } from 'express';
import { User } from '@/models/user';
import { getTenantId } from '@/api/helpers/tenantHelper';

// 有効なロール一覧 / 有效角色列表
const VALID_ROLES = ['admin', 'manager', 'operator', 'viewer', 'client'] as const;

/**
 * ユーザー一覧取得 / 获取用户列表
 * GET /api/users
 */
export const listUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = getTenantId(req);
    const { search, role, warehouseId, isActive, page, limit } = req.query;

    const filter: Record<string, unknown> = { tenantId };

    // 検索フィルタ / 搜索过滤
    if (typeof search === 'string' && search.trim()) {
      const escaped = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = [
        { email: { $regex: escaped, $options: 'i' } },
        { displayName: { $regex: escaped, $options: 'i' } },
      ];
    }

    // ロールフィルタ / 角色过滤
    if (typeof role === 'string' && VALID_ROLES.includes(role as typeof VALID_ROLES[number])) {
      filter.role = role;
    }

    // 倉庫フィルタ / 仓库过滤
    if (typeof warehouseId === 'string' && warehouseId.trim()) {
      filter.warehouseIds = warehouseId.trim();
    }

    // アクティブフィルタ / 有效过滤
    if (typeof isActive === 'string') {
      if (isActive === 'true') filter.isActive = true;
      if (isActive === 'false') filter.isActive = false;
    }

    const pageNum = Math.max(1, parseInt(String(page || '1'), 10) || 1);
    const limitNum = Math.min(200, Math.max(1, parseInt(String(limit || '50'), 10) || 50));
    const skip = (pageNum - 1) * limitNum;

    // passwordHash を除外 / 排除 passwordHash
    const [data, total] = await Promise.all([
      User.find(filter)
        .select('-passwordHash')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      User.countDocuments(filter),
    ]);

    res.json({ data, total });
  } catch (error: any) {
    res.status(500).json({ message: 'ユーザー一覧の取得に失敗しました / 获取用户列表失败' });
  }
};

/**
 * ユーザー詳細取得 / 获取用户详情
 * GET /api/users/:id
 */
export const getUser = async (req: Request, res: Response): Promise<void> => {
  try {
    // passwordHash を除外 / 排除 passwordHash
    const item = await User.findById(req.params.id).select('-passwordHash').lean();
    if (!item) {
      res.status(404).json({ message: 'ユーザーが見つかりません / 用户未找到' });
      return;
    }
    res.json(item);
  } catch (error: any) {
    res.status(500).json({ message: 'ユーザーの取得に失敗しました / 获取用户失败' });
  }
};

/**
 * ユーザー作成 / 创建用户
 * POST /api/users
 */
export const createUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = getTenantId(req);
    const {
      email, password, displayName, role,
      warehouseIds, clientId, clientName, parentUserId,
      phone, avatar, language, memo, isActive,
    } = req.body;

    // バリデーション / 验证
    if (!email || typeof email !== 'string' || !email.trim()) {
      res.status(400).json({ message: 'メールアドレスは必須です / 邮箱为必填项' });
      return;
    }
    if (!password || typeof password !== 'string' || password.length < 6) {
      res.status(400).json({ message: 'パスワードは6文字以上必須です / 密码至少6个字符' });
      return;
    }
    if (!displayName || typeof displayName !== 'string' || !displayName.trim()) {
      res.status(400).json({ message: '表示名は必須です / 显示名为必填项' });
      return;
    }
    if (role && !VALID_ROLES.includes(role)) {
      res.status(400).json({ message: `無効なロールです / 无效的角色: ${role}` });
      return;
    }

    // メール重複チェック（テナント内） / 邮箱重复检查（租户内）
    const existing = await User.findOne({ tenantId, email: email.trim().toLowerCase() }).lean();
    if (existing) {
      res.status(409).json({
        message: `メールアドレス「${email.trim()}」は既に使用されています / 邮箱已被使用`,
        duplicateField: 'email',
        duplicateValue: email.trim(),
      });
      return;
    }

    // パスワードハッシュ化 / 密码哈希化
    const passwordHash = User.hashPassword(password);

    const created = await User.create({
      tenantId,
      email: email.trim().toLowerCase(),
      passwordHash,
      displayName: displayName.trim(),
      role: role || 'operator',
      warehouseIds: warehouseIds || undefined,
      clientId: clientId || undefined,
      clientName: clientName?.trim() || undefined,
      parentUserId: parentUserId || undefined,
      phone: phone?.trim() || undefined,
      avatar: avatar?.trim() || undefined,
      language: language || undefined,
      memo: memo?.trim() || undefined,
      isActive: isActive !== undefined ? isActive : true,
    });

    // レスポンスから passwordHash を除外 / 响应中排除 passwordHash
    const result = created.toObject();
    const { passwordHash: _omitted, ...safeResult } = result;
    res.status(201).json(safeResult);
  } catch (error: any) {
    if (error.code === 11000) {
      const duplicateKey = error.keyPattern ? Object.keys(error.keyPattern)[0] : 'unknown';
      const duplicateValue = error.keyValue ? error.keyValue[duplicateKey] : 'unknown';
      res.status(409).json({
        message: `重複エラー / 重复错误: ${duplicateKey} = ${duplicateValue}`,
        duplicateField: duplicateKey,
        duplicateValue,
      });
      return;
    }
    res.status(500).json({ message: 'ユーザーの作成に失敗しました / 创建用户失败' });
  }
};

/**
 * ユーザー更新 / 更新用户
 * PUT /api/users/:id
 */
export const updateUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = getTenantId(req);
    const {
      email, password, displayName, role,
      warehouseIds, clientId, clientName, parentUserId,
      phone, avatar, language, memo, isActive,
    } = req.body;

    const existing = await User.findById(req.params.id).lean();
    if (!existing) {
      res.status(404).json({ message: 'ユーザーが見つかりません / 用户未找到' });
      return;
    }

    // メール変更時の重複チェック / 邮箱变更时的重复检查
    if (email && email.trim().toLowerCase() !== existing.email) {
      const duplicate = await User.findOne({
        tenantId,
        email: email.trim().toLowerCase(),
        _id: { $ne: existing._id },
      }).lean();
      if (duplicate) {
        res.status(409).json({
          message: `メールアドレス「${email.trim()}」は既に使用されています / 邮箱已被使用`,
          duplicateField: 'email',
          duplicateValue: email.trim(),
        });
        return;
      }
    }

    // ロールバリデーション / 角色验证
    if (role && !VALID_ROLES.includes(role)) {
      res.status(400).json({ message: `無効なロールです / 无效的角色: ${role}` });
      return;
    }

    const updateData: Record<string, unknown> = {};
    if (email !== undefined) updateData.email = email.trim().toLowerCase();
    if (displayName !== undefined) updateData.displayName = displayName.trim();
    if (role !== undefined) updateData.role = role;
    if (warehouseIds !== undefined) updateData.warehouseIds = warehouseIds;
    if (clientId !== undefined) updateData.clientId = clientId || undefined;
    if (clientName !== undefined) updateData.clientName = clientName?.trim() || undefined;
    if (parentUserId !== undefined) updateData.parentUserId = parentUserId || undefined;
    if (phone !== undefined) updateData.phone = phone?.trim() || undefined;
    if (avatar !== undefined) updateData.avatar = avatar?.trim() || undefined;
    if (language !== undefined) updateData.language = language || undefined;
    if (memo !== undefined) updateData.memo = memo?.trim() || undefined;
    if (isActive !== undefined) updateData.isActive = isActive;

    // パスワード変更 / 密码变更
    if (password && typeof password === 'string' && password.length >= 6) {
      updateData.passwordHash = User.hashPassword(password);
    }

    // passwordHash を除外して返却 / 排除 passwordHash 返回
    const updated = await User.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    })
      .select('-passwordHash')
      .lean();

    if (!updated) {
      res.status(404).json({ message: 'ユーザーが見つかりません / 用户未找到' });
      return;
    }

    res.json(updated);
  } catch (error: any) {
    if (error.code === 11000) {
      const duplicateKey = error.keyPattern ? Object.keys(error.keyPattern)[0] : 'unknown';
      const duplicateValue = error.keyValue ? error.keyValue[duplicateKey] : 'unknown';
      res.status(409).json({
        message: `重複エラー / 重复错误: ${duplicateKey} = ${duplicateValue}`,
        duplicateField: duplicateKey,
        duplicateValue,
      });
      return;
    }
    res.status(500).json({ message: 'ユーザーの更新に失敗しました / 更新用户失败' });
  }
};

/**
 * ユーザー削除（ソフトデリート） / 删除用户（软删除）
 * DELETE /api/users/:id
 */
export const deleteUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const updated = await User.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true },
    )
      .select('-passwordHash')
      .lean();

    if (!updated) {
      res.status(404).json({ message: 'ユーザーが見つかりません / 用户未找到' });
      return;
    }

    res.json({ message: 'Deleted', id: updated._id });
  } catch (error: any) {
    res.status(500).json({ message: 'ユーザーの削除に失敗しました / 删除用户失败' });
  }
};

/**
 * 子ユーザー一覧取得 / 获取子用户列表
 * GET /api/users/:id/sub-users
 */
export const listSubUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = getTenantId(req);

    // 親ユーザーの存在確認 / 确认父用户存在
    const parent = await User.findById(req.params.id).select('_id tenantId').lean();
    if (!parent) {
      res.status(404).json({ message: '親ユーザーが見つかりません / 父用户未找到' });
      return;
    }

    // passwordHash を除外 / 排除 passwordHash
    const subUsers = await User.find({
      tenantId,
      parentUserId: req.params.id,
    })
      .select('-passwordHash')
      .sort({ createdAt: -1 })
      .lean();

    res.json({ data: subUsers, total: subUsers.length });
  } catch (error: any) {
    res.status(500).json({ message: '子ユーザーの取得に失敗しました / 获取子用户失败' });
  }
};

/**
 * パスワード変更 / 修改密码
 * POST /api/users/:id/change-password
 */
export const changePassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { oldPassword, newPassword } = req.body;

    // バリデーション / 验证
    if (!oldPassword || typeof oldPassword !== 'string') {
      res.status(400).json({ message: '現在のパスワードは必須です / 当前密码为必填项' });
      return;
    }
    if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 6) {
      res.status(400).json({ message: '新しいパスワードは6文字以上必須です / 新密码至少6个字符' });
      return;
    }

    // ユーザー取得（passwordHash含む） / 获取用户（含passwordHash）
    const user = await User.findById(req.params.id).lean();
    if (!user) {
      res.status(404).json({ message: 'ユーザーが見つかりません / 用户未找到' });
      return;
    }

    // 旧パスワード検証 / 验证旧密码
    const isValid = User.verifyPassword(oldPassword, user.passwordHash);
    if (!isValid) {
      res.status(401).json({ message: '現在のパスワードが正しくありません / 当前密码不正确' });
      return;
    }

    // 新パスワードハッシュ化・更新 / 新密码哈希化并更新
    const newHash = User.hashPassword(newPassword);
    await User.findByIdAndUpdate(req.params.id, { passwordHash: newHash });

    res.json({ message: 'パスワードを変更しました / 密码已修改' });
  } catch (error: any) {
    res.status(500).json({ message: 'パスワードの変更に失敗しました / 修改密码失败' });
  }
};
