
const vscode = acquireVsCodeApi();
const callbacks = {};

/**
 * 调用vscode原生api
 * @param data 可以是类似 {cmd: 'xxx', param1: 'xxx'}，也可以直接是 cmd 字符串
 * @param cb 可选的回调函数
 */
function callVscode(data, cb) {
    if (typeof data === 'string') {
        data = { cmd: data };
    }
    if (cb) {
        // 时间戳加上5位随机数
        const cbid = Date.now() + '' + Math.round(Math.random() * 100000);
        callbacks[cbid] = cb;
        data.cbid = cbid;
    }
    vscode.postMessage(data);
}

window.addEventListener('message', event => {
    const message = event.data;
    switch (message.cmd) {
        case 'vscodeCallback':
            (callbacks[message.cbid] || function () { })(message.data);
            delete callbacks[message.cbid];
            break;
        default: break;
    }
});

new Vue({
    el: '#app',
    data: {
    },
    mounted() {
        callVscode({cmd: 'getRecord', day: '20191210'}, result => {
            this.updateChart(result)
        });
    },
    methods: {
        updateChart(result){
            var date = [];
            var data = []
            for (var i = 0; i < 24; i++) {
                for(var j=0;j<60;j+=10){
                    date.push(`${i<10?'0':''}${i}:${j<10?'0':''}${j}`);
                    data.push(0)
                }
            }
            result.forEach(r => {
                var recordTime = new Date(r.time)
                var hour = recordTime.getHours()
                var minute = Math.ceil((recordTime.getMinutes()*60+recordTime.getSeconds())/600)
                if(r.type==='coding'){
                    data[hour*6+minute] += 10
                }
            })

            let xAxis = Array.from(new Set(result.map(r => r.type)))
            // let data = xAxis.map(x => result.filter(r => r.type==x).length)
            var myChart = echarts.init(this.$refs.chart, 'dark');
            // 指定图表的配置项和数据
            var option = {
                title: {
                    left: 'center',
                    text: 'VS Recoder'
                },
                tooltip: {
                    trigger: 'axis',
                    position: function (pt) {
                        return [pt[0], '10%'];
                    }
                },
                xAxis: {
                    type: 'category',
                    boundaryGap: false,
                    data: date
                },
                yAxis: {
                    type: 'value',
                    boundaryGap: [0, '50%']
                },
                series: [{
                    name: 'Coding record',
                    type: 'line',
                    smooth: true,
                    symbol: 'none',
                    sampling: 'average',
                    itemStyle: {
                        color: 'rgb(255, 70, 131)'
                    },
                    areaStyle: {
                        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{
                            offset: 0,
                            color: 'rgb(255, 158, 68)'
                        }, {
                            offset: 1,
                            color: 'rgb(255, 70, 131)'
                        }])
                    },
                    data: data
                }]
            };

            // 使用刚指定的配置项和数据显示图表。
            myChart.setOption(option);
        },
        test(){
            callVscode({cmd: 'getRecord', day: '20191210'}, result => {
                this.updateChart(result)
            });
        },
        getTime() {
            const hour = new Date().getHours();
            if (hour <= 8) return '早上';
            else if (hour < 12) return '上午';
            else if (hour < 14) return '中午';
            else if (hour < 18) return '下午';
            return '晚上';
        }
    }
});