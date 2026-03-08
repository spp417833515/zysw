import React, { useState, useEffect } from 'react';
import { Modal, Form, DatePicker, Select, Button, message } from 'antd';
import dayjs from 'dayjs';
import { getCompanyInfo, type CompanyInfo } from '@/api/settings';
import type { Employee } from '@/types/employee';

interface ContractModalProps {
  open: boolean;
  employee: Employee | null;
  onCancel: () => void;
}

const probationOptions = [
  { label: '无', value: 0 },
  { label: '1个月', value: 1 },
  { label: '2个月', value: 2 },
  { label: '3个月', value: 3 },
  { label: '6个月', value: 6 },
];

const workTimeOptions = [
  { label: '标准工时制', value: '标准工时制' },
  { label: '综合计算工时制', value: '综合计算工时制' },
  { label: '不定时工作制', value: '不定时工作制' },
];

function generateContractHTML(employee: Employee, company: Partial<CompanyInfo>, params: {
  startDate: string;
  endDate: string;
  probation: number;
  workTimeSystem: string;
}) {
  const { startDate, endDate, probation, workTimeSystem } = params;

  const probationText = probation > 0
    ? `试用期为${probation}个月，自${startDate}起至${dayjs(startDate).add(probation, 'month').format('YYYY年MM月DD日')}止。`
    : '无试用期。';

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<title>聘用合同 - ${employee.name}</title>
<style>
  @media print {
    @page {
      size: A4;
      margin: 25mm 20mm;
    }
    body { margin: 0; }
    .no-print { display: none !important; }
  }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: "SimSun", "宋体", "Songti SC", serif;
    font-size: 14px;
    line-height: 1.8;
    color: #000;
    padding: 25mm 20mm;
  }
  h1 {
    font-family: "SimHei", "黑体", "Heiti SC", sans-serif;
    font-size: 26px;
    text-align: center;
    margin-bottom: 30px;
    letter-spacing: 8px;
  }
  .party-info {
    margin-bottom: 20px;
    line-height: 2;
  }
  .party-info p { text-indent: 0; }
  .section {
    margin-bottom: 16px;
  }
  .section-title {
    font-family: "SimHei", "黑体", "Heiti SC", sans-serif;
    font-size: 15px;
    font-weight: bold;
    margin-bottom: 6px;
  }
  .section-body {
    text-indent: 2em;
    line-height: 2;
  }
  .section-body p {
    text-indent: 2em;
    margin-bottom: 4px;
  }
  .signature-area {
    margin-top: 60px;
    display: flex;
    justify-content: space-between;
  }
  .signature-block {
    width: 45%;
  }
  .signature-block p {
    margin-bottom: 16px;
    line-height: 2.2;
  }
  .sign-line {
    display: inline-block;
    min-width: 160px;
    border-bottom: 1px solid #000;
  }
  .print-btn-area {
    text-align: center;
    margin-bottom: 30px;
  }
  .print-btn {
    padding: 10px 40px;
    font-size: 16px;
    background: #1677ff;
    color: #fff;
    border: none;
    border-radius: 6px;
    cursor: pointer;
  }
  .print-btn:hover { background: #4096ff; }
</style>
</head>
<body>

<div class="no-print print-btn-area">
  <button class="print-btn" onclick="window.print()">打印合同</button>
</div>

<h1>聘 用 合 同</h1>

<div class="party-info">
  <p><strong>甲方（用人单位）：</strong>${company.companyName || '_______________'}</p>
  <p><strong>地　　址：</strong>${company.address || '_______________'}</p>
  <p><strong>联系电话：</strong>${company.phone || '_______________'}</p>
</div>

<div class="party-info">
  <p><strong>乙方（劳动者）：</strong>${employee.name || '_______________'}</p>
  <p><strong>身份证号：</strong>${employee.idNumber || '_______________'}</p>
  <p><strong>联系电话：</strong>${employee.phone || '_______________'}</p>
</div>

<p style="text-indent:2em; margin-bottom:20px; line-height:2;">
  根据《中华人民共和国劳动合同法》及相关法律法规，甲乙双方在平等自愿、协商一致的基础上，订立本合同。
</p>

<div class="section">
  <p class="section-title">第一条　合同期限</p>
  <div class="section-body">
    <p>本合同为固定期限劳动合同，自${dayjs(startDate).format('YYYY年MM月DD日')}起至${dayjs(endDate).format('YYYY年MM月DD日')}止。</p>
    <p>${probationText}</p>
  </div>
</div>

<div class="section">
  <p class="section-title">第二条　工作内容与工作地点</p>
  <div class="section-body">
    <p>甲方安排乙方在${employee.department || '_______________'}部门，担任${employee.position || '_______________'}岗位工作。</p>
    <p>工作地点为：${company.address || '_______________'}。</p>
  </div>
</div>

<div class="section">
  <p class="section-title">第三条　工作时间与休息休假</p>
  <div class="section-body">
    <p>甲方实行${workTimeSystem}。</p>
    <p>甲方应保证乙方每周至少休息一日，并依法安排乙方享有法定节假日、年休假等假期。</p>
  </div>
</div>

<div class="section">
  <p class="section-title">第四条　劳动报酬</p>
  <div class="section-body">
    <p>乙方月基本工资为人民币${employee.baseSalary ? employee.baseSalary.toLocaleString() : '______'}元（大写：${employee.baseSalary ? convertToChineseAmount(employee.baseSalary) : '______'}）。</p>
    <p>甲方于每月${employee.payDay || '______'}日以货币形式支付乙方工资。</p>
    <p>甲方根据经营状况、乙方工作业绩及考核结果，可合理调整乙方的劳动报酬。</p>
  </div>
</div>

<div class="section">
  <p class="section-title">第五条　社会保险与住房公积金</p>
  <div class="section-body">
    <p>甲乙双方应按照国家和地方有关规定参加社会保险，按时足额缴纳各项社会保险费用。其中依法应由乙方个人缴纳的部分，由甲方从乙方工资中代扣代缴。</p>
    <p>甲乙双方应按照国家和地方有关规定缴存住房公积金。</p>
  </div>
</div>

<div class="section">
  <p class="section-title">第六条　劳动保护与劳动条件</p>
  <div class="section-body">
    <p>甲方应为乙方提供符合国家规定的劳动安全卫生条件和必要的劳动防护用品，对从事有职业危害作业的乙方应当定期进行健康检查。</p>
    <p>乙方应严格遵守甲方依法制定的各项规章制度和劳动纪律，服从管理，积极完成工作任务。</p>
  </div>
</div>

<div class="section">
  <p class="section-title">第七条　合同的变更、解除和终止</p>
  <div class="section-body">
    <p>经甲乙双方协商一致，可以变更本合同的相关内容。</p>
    <p>甲乙双方解除或终止劳动合同，应当依照《中华人民共和国劳动合同法》及相关法律法规的规定执行。</p>
    <p>甲方解除或终止劳动合同时，应依法向乙方支付经济补偿金。</p>
  </div>
</div>

<div class="section">
  <p class="section-title">第八条　其他约定</p>
  <div class="section-body">
    <p>　</p>
    <p>　</p>
    <p>　</p>
  </div>
</div>

<p style="text-indent:2em; margin-top:10px; line-height:2;">
  本合同一式两份，甲乙双方各执一份，自双方签字（盖章）之日起生效。
</p>

<div class="signature-area">
  <div class="signature-block">
    <p><strong>甲方（盖章）：</strong></p>
    <p>法定代表人（或委托代理人）：</p>
    <p><span class="sign-line">&nbsp;</span></p>
    <p>签订日期：<span class="sign-line">&nbsp;</span></p>
  </div>
  <div class="signature-block">
    <p><strong>乙方（签名）：</strong></p>
    <p>　</p>
    <p><span class="sign-line">&nbsp;</span></p>
    <p>签订日期：<span class="sign-line">&nbsp;</span></p>
  </div>
</div>

</body>
</html>`;
}

function convertToChineseAmount(num: number): string {
  const digits = ['零', '壹', '贰', '叁', '肆', '伍', '陆', '柒', '捌', '玖'];
  const units = ['', '拾', '佰', '仟'];
  const bigUnits = ['', '万', '亿'];

  if (num === 0) return '零元整';

  const intPart = Math.floor(num);
  let str = '';
  const intStr = intPart.toString();
  const len = intStr.length;

  let zeroFlag = false;
  for (let i = 0; i < len; i++) {
    const d = parseInt(intStr[i]);
    const pos = len - 1 - i;
    const unitIdx = pos % 4;
    const bigIdx = Math.floor(pos / 4);

    if (d === 0) {
      zeroFlag = true;
      if (unitIdx === 0 && bigIdx > 0) {
        str += bigUnits[bigIdx];
        zeroFlag = false;
      }
    } else {
      if (zeroFlag) {
        str += '零';
        zeroFlag = false;
      }
      str += digits[d] + units[unitIdx];
      if (unitIdx === 0 && bigIdx > 0) {
        str += bigUnits[bigIdx];
      }
    }
  }

  return str + '元整';
}

const ContractModal: React.FC<ContractModalProps> = ({ open, employee, onCancel }) => {
  const [form] = Form.useForm();
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (open && employee) {
      const entryDate = employee.entryDate ? dayjs(employee.entryDate) : dayjs();
      form.setFieldsValue({
        startDate: entryDate,
        endDate: entryDate.add(3, 'year'),
        probation: 0,
        workTimeSystem: '标准工时制',
      });
    }
  }, [open, employee, form]);

  const handleGenerate = async () => {
    if (!employee) return;
    const values = await form.validateFields();
    setGenerating(true);
    try {
      const res = await getCompanyInfo();
      const company = res.data || {};

      const params = {
        startDate: values.startDate.format('YYYY-MM-DD'),
        endDate: values.endDate.format('YYYY-MM-DD'),
        probation: values.probation,
        workTimeSystem: values.workTimeSystem,
      };

      const html = generateContractHTML(employee, company, params);
      const win = window.open('', '_blank');
      if (win) {
        win.document.write(html);
        win.document.close();
      } else {
        message.error('无法打开新窗口，请检查浏览器是否阻止了弹出窗口');
      }
    } catch {
      message.error('获取公司信息失败，请先在设置中配置企业信息');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Modal
      title={`生成聘用合同 - ${employee?.name || ''}`}
      open={open}
      onCancel={onCancel}
      footer={null}
      destroyOnClose
      width={480}
    >
      <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
        <Form.Item label="合同起始日期" name="startDate" rules={[{ required: true, message: '请选择起始日期' }]}>
          <DatePicker style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item label="合同结束日期" name="endDate" rules={[{ required: true, message: '请选择结束日期' }]}>
          <DatePicker style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item label="试用期时长" name="probation" rules={[{ required: true }]}>
          <Select options={probationOptions} />
        </Form.Item>
        <Form.Item label="工作时间制度" name="workTimeSystem" rules={[{ required: true }]}>
          <Select options={workTimeOptions} />
        </Form.Item>
        <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
          <Button onClick={onCancel} style={{ marginRight: 8 }}>取消</Button>
          <Button type="primary" loading={generating} onClick={handleGenerate}>
            生成合同
          </Button>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default ContractModal;
