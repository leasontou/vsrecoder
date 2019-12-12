
const vscode = acquireVsCodeApi();
const callbacks = {};

function dateFormat(fmt, date) {
    let ret;
    let opt = {
        "Y+": date.getFullYear().toString(),        // 年
        "m+": (date.getMonth() + 1).toString(),     // 月
        "d+": date.getDate().toString(),            // 日
        "H+": date.getHours().toString(),           // 时
        "M+": date.getMinutes().toString(),         // 分
        "S+": date.getSeconds().toString()          // 秒
        // 有其他格式化字符需求可以继续添加，必须转化成字符串
    };
    for (let k in opt) {
        ret = new RegExp("(" + k + ")").exec(fmt);
        if (ret) {
            fmt = fmt.replace(ret[1], (ret[1].length == 1) ? (opt[k]) : (opt[k].padStart(ret[1].length, "0")))
        };
    };
    return fmt;
}

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
        var day = dateFormat('YYYYmmdd',new Date())
        callVscode({cmd: 'getRecord', day: day}, result => {
            this.updateChart(result)
        });
    },
    methods: {
        updateChart(result){
            var hours = ['1', '2', '3', '4', '5', '6',
                    '7', '8', '9','10','11',
                    '12', '13', '14', '15', '16', '17',
                    '18', '19', '20', '21', '22', '23','24'];
            var minutes = ['10', '20', '30',
                    '40', '50', '60'];

            var data = [];
            for(var i=0;i<hours.length;i++){
                for(var j=0;j<minutes.length;j++){
                    data.push([i,j,0])
                }
            }
            result.forEach(r => {
                var recordTime = new Date(r.time)
                var hour = recordTime.getHours()
                var minute = Math.ceil((recordTime.getMinutes()*60+recordTime.getSeconds())/600)-1
                if(r.type==='coding' || r.type==='debug'){
                    var cell = data[hour*6+minute]
                    data[hour*6+minute] = [cell[0],cell[1],5]
                }
            })

            data = data.map(function (item) {
                return [item[0], item[1], item[2] || '-'];
            });
            var option = {
                tooltip: {
                    position: 'top'
                },
                animation: false,
                grid: {
                    top: 20,
                    bottom: 20,
                    left: 20,
                    right: 20,
                    containLabel: true,
                    show: true,
                    backgroundColor: '#e0e0e0',
                },
                xAxis: {
                    type: 'category',
                    data: hours,
                    zlevel: 100,
                    splitLine: {
                        show: true,
                        interval: 0,
                        lineStyle:{
                           color: ['rgba(200,200,200,0.8)'],
                           width: 1,
                           type: 'solid'
                        }
                　　},
                    // splitArea: {
                    //     show: true,
                    //     areaStyle: {
                    //         color: ['rgba(250,250,250,0.9)','rgba(200,200,200,0.5)']
                    //     }
                    // },
                    axisTick: {
                        show: false
                    }
                },
                yAxis: {
                    type: 'category',
                    data: minutes,
                    zlevel: 100,
                    splitLine: {
                        show: true,
                        interval: 0,
                        lineStyle:{
                            color: ['rgba(200,200,200,0.8)'],
                           width: 1,
                           type: 'solid'
                        }
                　　},
                    // splitArea: {
                    //     show: true,
                    //     areaStyle: {
                    //         color: ['rgba(250,250,250,0.9)','rgba(200,200,200,1)']
                    //     }
                    // },
                    axisTick: {
                        show: false
                    }
                },
                // visualMap: {
                //     min: 0,
                //     max: 10,
                //     calculable: true,
                //     orient: 'horizontal',
                //     left: 'center',
                //     bottom: '15%'
                // },
                series: [{
                    name: 'Punch Card',
                    type: 'heatmap',
                    data: data,
                    label: {
                        normal: {
                            show: true
                        }
                    },
                    itemStyle: {
                        emphasis: {
                            shadowBlur: 10,
                            shadowColor: 'rgba(0, 0, 0, 0.5)'
                        }
                    }
                }]
            };

            var myChart = echarts.init(this.$refs.chart, 'dark');
            myChart.setOption(option);
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