#!/bin/bash

echo "=========================================="
echo "税率设置功能测试"
echo "=========================================="
echo ""

# 测试1: 获取税率设置
echo "1. 测试获取税率设置 API"
echo "GET /settings/tax"
curl -s http://localhost:8000/settings/tax | python3 -m json.tool
echo ""
echo ""

# 测试2: 更新税率设置
echo "2. 测试更新税率设置 API"
echo "POST /settings/tax"
curl -s -X POST http://localhost:8000/settings/tax \
  -H "Content-Type: application/json" \
  -d '{
    "vatRate": 0.03,
    "vatThresholdQuarterly": 300000,
    "additionalTaxRate": 0.12,
    "incomeTaxEnabled": true,
    "province": "河南",
    "city": "郑州",
    "taxpayerType": "small"
  }' | python3 -m json.tool
echo ""
echo ""

# 测试3: 检查数据库
echo "3. 检查数据库中的税率设置"
sqlite3 server/data.db "SELECT * FROM tax_settings LIMIT 1"
echo ""
echo ""

echo "=========================================="
echo "测试完成！"
echo "=========================================="
echo ""
echo "下一步："
echo "1. 访问 http://localhost:5173/settings 配置税率"
echo "2. 访问 http://localhost:5173 查看仪表盘的季度交税预算"
echo ""
