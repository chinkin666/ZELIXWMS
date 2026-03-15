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

export const userRouter = Router();

userRouter.get('/', listUsers);
userRouter.post('/', createUser);
userRouter.get('/:id', getUser);
userRouter.put('/:id', updateUser);
userRouter.delete('/:id', deleteUser);
// 子ユーザー一覧 / 子用户列表
userRouter.get('/:id/sub-users', listSubUsers);
// パスワード変更 / 修改密码
userRouter.post('/:id/change-password', changePassword);
