// 创建 XMLHttpRequest 对象
let xhr = new XMLHttpRequest();

// 添加事件监听器，响应加载完成事件
xhr.addEventListener('load', function() {
  // 解析 CSV 数据
  let csvData = xhr.responseText;
  let rows = csvData.split('\n');
  let data = [];
  for (let i = 0; i < rows.length; i++) {
    let row = rows[i].trim();
    if (row.length > 0) {
      let values = row.split(',');
      data.push({rank: values[0], name: values[1], score: values[2]});
    }
  }

  // 动态生成表格，填充排行榜
  let tbody = document.getElementById('rankings').getElementsByTagName('tbody')[0];
  tbody.innerHTML = '';
  for (let i = 0; i < data.length; i++) {
    let tr = document.createElement('tr');
    let td1 = document.createElement('td');
    let td2 = document.createElement('td');
    let td3 = document.createElement('td');
    td1.textContent = data[i].rank;
    td2.textContent = data[i].name;
    td3.textContent = data[i].score;
    tr.appendChild(td1);
    tr.appendChild(td2);
    tr.appendChild(td3);
    tbody.appendChild(tr);
  }
});

// 发送 GET 请求，加载 CSV 文件
xhr.open('GET', 'pagerank.csv');
xhr.send();
