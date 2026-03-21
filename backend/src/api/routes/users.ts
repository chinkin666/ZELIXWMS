import { Router } from 'express';
import {
  listUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
  listSubUsers,
  changePassword,
} from '@/api/controllers/userController';
// CRIT-03: ロールチェック追加 / 添加角色检查
import { requireRole } from '@/api/middleware/auth';

export const userRouter = Router();

// 読み取り（認証済みユーザー）/ 读取（已认证用户）
userRouter.get('/', listUsers);
userRouter.get('/:id', getUser);
// 子ユーザー一覧 / 子用户列表
userRouter.get('/:id/sub-users', listSubUsers);

// 書き込み（admin・manager のみ）/ 写入（仅 admin・manager）
userRouter.post('/', requireRole('admin', 'manager'), createUser);
userRouter.put('/:id', requireRole('admin', 'manager'), updateUser);
userRouter.delete('/:id', requireRole('admin', 'manager'), deleteUser);
// パスワード変更（admin・manager のみ）/ 修改密码（仅 admin・manager）
userRouter.post('/:id/change-password', requireRole('admin', 'manager'), changePassword);
