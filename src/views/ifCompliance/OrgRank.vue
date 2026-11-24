<template>
  <el-card header="辖区机构合规排名">
    <el-table :data="rankList" border>
      <el-table-column label="机构ID" prop="orgId"/>
      <el-table-column label="任务名称" prop="taskName"/>
      <el-table-column label="合规分数" prop="totalScore"/>
      <el-table-column label="检查时间" prop="checkTime"/>
    </el-table>
  </el-card>
</template>
<script>
import request from '@/api/request'
export default {
  data(){
    return {rankList:[]}
  },
  mounted(){
    this.loadRank()
  },
  methods:{
    async loadRank(){
      const res = await request.get('/ifCompliance/rank')
      this.rankList = res.data
    }
  }
}
</script>