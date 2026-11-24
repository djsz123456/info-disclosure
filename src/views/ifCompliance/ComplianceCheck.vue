<template>
  <div class="app-container">
    <el-card header="互联网金融机构信息披露合规检查">
      <el-form :model="form" label-width="120px">
        <el-form-item label="选择机构">
          <el-select v-model="form.orgId" placeholder="请选择机构">
            <el-option label="测试机构A" value="1"/>
          </el-select>
        </el-form-item>
        <el-form-item label="报告期">
          <el-input v-model="form.reportPeriod"/>
        </el-form-item>
        <el-form-item label="实缴资本">
          <el-input v-model="form.paidCapital"/>
        </el-form-item>
        <el-form-item label="预期收益率">
          <el-input v-model="form.expectedYield"/>
        </el-form-item>
        <el-form-item label="披露日期">
          <el-date-picker v-model="form.discloseDate" type="date"/>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="runCheck">执行合规检查</el-button>
        </el-form-item>
      </el-form>
    </el-card>
    <el-card v-if="resultTask" header="检查结果">
      <div>合规总分：<span style="font-size:22px;color:red">{{resultTask.totalScore}}</span>/100</div>
      <el-table :data="detailList" border style="width:100%;margin-top:10px">
        <el-table-column label="检查维度" prop="checkDimension"/>
        <el-table-column label="字段名称" prop="fieldName"/>
        <el-table-column label="原值" prop="originValue"/>
        <el-table-column label="扣减分数" prop="deductScore"/>
        <el-table-column label="整改建议" prop="suggest"/>
      </el-table>
      <el-button type="success" @click="exportReport">导出合规报告</el-button>
    </el-card>
  </div>
</template>
<script>
import request from '@/api/request'
export default {
  name: "ComplianceCheck",
  data(){
    return {
      form:{
        orgId: null,
        reportPeriod:'',
        paidCapital:'',
        expectedYield:'',
        discloseDate:null
      },
      resultTask:null,
      detailList:[],
      taskId:null
    }
  },
  methods:{
    async runCheck(){
      const res = await request.post('/ifCompliance/runCheck', this.form, {params:{orgId:this.form.orgId,taskName:'披露合规检查任务'}})
      this.resultTask = res.data
      this.taskId = res.data.id
      // 查询扣分明细
      const detailRes = await request.get('/ifCompliance/getDetail',{params:{taskId:this.taskId}})
      this.detailList = detailRes.data
    },
    exportReport(){
      window.open((import.meta.env.VITE_API_BASE_URL ?? '/api') + '/ifCompliance/export?taskId=' + this.taskId)
    }
  }
}
</script>