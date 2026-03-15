<template>
  <div>
    <h2 style="margin: 0 0 24px">Platform Dashboard</h2>
    <el-row :gutter="16">
      <el-col :span="6"><el-card shadow="hover"><div style="color: #909399">全客户数</div><div style="font-size: 28px; font-weight: bold; margin-top: 8px">--</div></el-card></el-col>
      <el-col :span="6"><el-card shadow="hover"><div style="color: #909399">全仓库数</div><div style="font-size: 28px; font-weight: bold; margin-top: 8px">--</div></el-card></el-col>
      <el-col :span="6"><el-card shadow="hover"><div style="color: #909399">本月营收</div><div style="font-size: 28px; font-weight: bold; margin-top: 8px">--</div></el-card></el-col>
      <el-col :span="6"><el-card shadow="hover"><div style="color: #909399">活跃预定</div><div style="font-size: 28px; font-weight: bold; margin-top: 8px">--</div></el-card></el-col>
    </el-row>
  </div>
</template>
