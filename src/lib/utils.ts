export function formatAuditMessage(log: any) {
  const { old_data, new_data, table_name } = log;
  
  if (!old_data) return `新增了這筆資料`;
  if (!new_data) return `刪除了這筆資料`;

  const changes = [];
  for (const key in new_data) {
    if (new_data[key] !== old_data[key]) {
      // 轉換欄位名稱為中文
      const fieldMap: Record<string, string> = {
        nickname: '暱稱',
        gear_score: '裝備分數',
        vocation_id: '職業',
        status: '狀態',
        boss_name: 'Boss'
      };
      changes.push(`將 [${fieldMap[key] || key}] 從 "${old_data[key] || '空'}" 改為 "${new_data[key]}"`);
    }
  }
  return changes.join('、');
}
