import type { Request, Response } from 'express';
import { OrderGroup, type IOrderGroup } from '@/models/orderGroup';
import { ShipmentOrder } from '@/models/shipmentOrder';
import { generateOrderGroupId } from '@/utils/idGenerator';

// ============================================
// CRUD Controllers
// ============================================

/**
 * List all order groups sorted by priority
 * GET /api/order-groups
 */
export const listOrderGroups = async (req: Request, res: Response): Promise<void> => {
  try {
    const groups = await OrderGroup.find().sort({ priority: 1 }).lean();
    res.json(groups);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ message: '検品グループの取得に失敗しました', error: message });
  }
};

/**
 * Get order counts per group (for badge display)
 * GET /api/order-groups/counts
 * Returns: { total: number, groups: { [groupName]: number }, uncategorized: number }
 */
export const getOrderGroupCounts = async (req: Request, res: Response): Promise<void> => {
  try {
    // Base filter: same as ShipmentList page
    const baseFilter = {
      'status.confirm.isConfirmed': true,
      'status.carrierReceipt.isReceived': true,
      $or: [
        { 'status.shipped.isShipped': { $ne: true } },
        { 'status.shipped.isShipped': { $exists: false } },
      ],
    };

    // Aggregate counts by orderGroupId
    const pipeline = [
      { $match: baseFilter },
      {
        $group: {
          _id: { $ifNull: ['$orderGroupId', null] },
          count: { $sum: 1 },
        },
      },
    ];

    const results = await ShipmentOrder.aggregate(pipeline);

    let total = 0;
    let uncategorized = 0;
    const groups: Record<string, number> = {};

    for (const r of results) {
      total += r.count;
      if (r._id === null || r._id === '' || r._id === undefined) {
        uncategorized += r.count;
      } else {
        groups[r._id] = r.count;
      }
    }

    res.json({ total, groups, uncategorized });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ message: 'カウントの取得に失敗しました', error: message });
  }
};

/**
 * Get a single order group by ID
 * GET /api/order-groups/:id
 */
export const getOrderGroup = async (req: Request, res: Response): Promise<void> => {
  try {
    const group = await OrderGroup.findById(req.params.id).lean();
    if (!group) {
      res.status(404).json({ message: '検品グループが見つかりません' });
      return;
    }
    res.json(group);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ message: '検品グループの取得に失敗しました', error: message });
  }
};

/**
 * Create a new order group
 * POST /api/order-groups
 */
export const createOrderGroup = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, description, priority, enabled } = req.body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      res.status(400).json({ message: 'グループ名は必須です' });
      return;
    }

    // Check for duplicate name
    const existing = await OrderGroup.findOne({ name: name.trim() }).lean();
    if (existing) {
      res.status(409).json({ message: `グループ名「${name.trim()}」は既に存在します` });
      return;
    }

    // Auto-generate unique orderGroupId
    const orderGroupId = await generateOrderGroupId();

    const group = await OrderGroup.create({
      orderGroupId,
      name: name.trim(),
      description: description?.trim() || undefined,
      priority: typeof priority === 'number' ? priority : 100,
      enabled: enabled !== false,
    });

    res.status(201).json(group.toObject());
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ message: '検品グループの作成に失敗しました', error: message });
  }
};

/**
 * Update an order group
 * PUT /api/order-groups/:id
 */
export const updateOrderGroup = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, description, priority, enabled } = req.body;

    const updateData: Record<string, unknown> = {};

    if (name !== undefined) {
      if (typeof name !== 'string' || !name.trim()) {
        res.status(400).json({ message: 'グループ名は必須です' });
        return;
      }
      // Check for duplicate name (excluding current)
      const existing = await OrderGroup.findOne({
        name: name.trim(),
        _id: { $ne: req.params.id },
      }).lean();
      if (existing) {
        res.status(409).json({ message: `グループ名「${name.trim()}」は既に存在します` });
        return;
      }
      updateData.name = name.trim();
    }

    if (description !== undefined) {
      updateData.description = description?.trim() || undefined;
    }

    if (priority !== undefined && typeof priority === 'number') {
      updateData.priority = priority;
    }

    if (enabled !== undefined) {
      updateData.enabled = Boolean(enabled);
    }

    const updated = await OrderGroup.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    }).lean();

    if (!updated) {
      res.status(404).json({ message: '検品グループが見つかりません' });
      return;
    }

    res.json(updated);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ message: '検品グループの更新に失敗しました', error: message });
  }
};

/**
 * Delete an order group
 * DELETE /api/order-groups/:id
 */
export const deleteOrderGroup = async (req: Request, res: Response): Promise<void> => {
  try {
    const deleted = await OrderGroup.findByIdAndDelete(req.params.id).lean();
    if (!deleted) {
      res.status(404).json({ message: '検品グループが見つかりません' });
      return;
    }

    // Clear orderGroupId from orders that had this group
    await ShipmentOrder.updateMany(
      { orderGroupId: deleted.orderGroupId },
      { $unset: { orderGroupId: '' } },
    );

    res.json({ message: '検品グループを削除しました', id: deleted._id });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ message: '検品グループの削除に失敗しました', error: message });
  }
};

/**
 * Reorder groups by setting their priority based on array order
 * POST /api/order-groups/reorder
 * body: { orderedIds: string[] }
 */
export const reorderOrderGroups = async (req: Request, res: Response): Promise<void> => {
  try {
    const { orderedIds } = req.body;

    if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
      res.status(400).json({ message: 'orderedIds配列は必須です' });
      return;
    }

    // Update priority for each group based on array index
    const bulkOps = orderedIds.map((id, index) => ({
      updateOne: {
        filter: { _id: id },
        update: { $set: { priority: index + 1 } },
      },
    }));

    await OrderGroup.bulkWrite(bulkOps);

    res.json({ message: '優先順位を更新しました' });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ message: '優先順位の更新に失敗しました', error: message });
  }
};
