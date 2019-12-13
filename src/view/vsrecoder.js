
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

function paddingZero(value){
    if(value<10){
        return '0'+value
    }
    return value
}
new Vue({
    el: '#app',
    data: {
        dateForShow: moment(),
        // currentDate: moment().format('YYYY-MM-DD')
    },
    mounted() {
        var day = dateFormat('YYYYmmdd',new Date())
        callVscode({cmd: 'getRecord', day: day}, result => {
            this.updateChart(result, day)
        });
        $("#datepicker").daterangepicker({
            singleDatePicker: true,
            showDropdowns: true,
            opens: 'center',
          }, (start,end,label) => {
            this.dateForShow = start
          });
    },
    computed:{
        currentDate(){
            return this.dateForShow.format('YYYY-MM-DD')
        }
    },
    watch: {
        dateForShow(val){
            var day = this.dateForShow.format('YYYYMMDD')
            callVscode({cmd: 'getRecord', day: day}, result => {
                this.updateChart(result, day)
            });
        }
    },
    methods: {
        updateChart(result,startDay){
            var hours = ['00','01', '02', '03', '04', '05', '06',
                    '07', '08', '09','10','11',
                    '12', '13', '14', '15', '16', '17',
                    '18', '19', '20', '21', '22', '23'];
            var minutes = ['00', '10', '20',
                    '30', '40', '50'];

            var data = [];
            for(var i=0;i<hours.length;i++){
                for(var j=0;j<minutes.length;j++){
                    data.push([i,j,0,[]])
                }
            }
            result.forEach(r => {
                var recordTime = new Date(r.time)
                var hour = recordTime.getHours()
                var minute = Math.ceil((recordTime.getMinutes()*60+recordTime.getSeconds())/600)-1
                if(r.type==='coding' || r.type==='debug'){
                    var cell = data[hour*6+minute]
                    cell[3].push(r.type)
                    data[hour*6+minute] = [cell[0],cell[1],cell[2]+1, Array.from(new Set(cell[3]))]
                }
            })

            data = data.map(function (item) {
                return [item[0], item[1], item[2] || '-', item[3]];
            });
            var option = {
                title: {
                    show: false,
                    text: `${startDay.substr(0,4)}-${startDay.substr(4,2)}-${startDay.substr(6,2)}`,
                    left: 'center',
                    top: 10,
                },
                tooltip: {
                    position: 'top',
                    padding: 0,
                    formatter: function(params){
                        var startHour = params.value[0]
                        var startMinute = params.value[1]
                        var endHour = startMinute<5?startHour:startHour+1
                        var endMinute = startMinute<5?(startMinute+1):0
                        var tasks = params.value[3].join("<br />")
                        var frequency = params.value[2]
                        return `
                        <table border="0" style="border-collapse:collapse;">
                            <tr>
                                <th colspan="2" style="padding: 5px;">${params.marker}${paddingZero(startHour)}:${paddingZero(startMinute*10)}-${paddingZero(endHour)}:${paddingZero(endMinute*10)}</th>
                            </tr>
                            <tr>
                                <td valign="top style="padding: 2px 5px;">Task</td>
                                <td valign="top" align="right" style="padding: 2px 5px;">${tasks}</td>
                            </tr>
                            <tr>
                                <td style="padding: 2px 5px;">Frequency</td>
                                <td align="right" style="padding: 2px 5px;">${frequency}</td>
                            </tr>
                        </table>
                        `
                    }
                },
                animation: true,
                grid: {
                    top: 'middle',
                    left: 'center',
                    width: 640,
                    height: 160,
                    containLabel: false,
                    show: true,
                    backgroundColor: '#ebedf0',
                },
                visualMap: {
                    show: false,
                    min: 0,
                    max: 10,
                    dimension: 2,
                    calculable: false,
                    orient: 'horizontal',
                    left: 'center',
                },
                xAxis: {
                    type: 'category',
                    name: 'Hour',
                    data: hours,
                    zlevel: 100,
                    splitLine: {
                        show: true,
                        interval: 0,
                        lineStyle:{
                           color: ['rgba(255,255,255,1)'],
                           width: 1,
                           type: 'solid'
                        }
                　　},
                    axisTick: {
                        show: false
                    }
                },
                yAxis: {
                    type: 'category',
                    name: 'Minute',
                    data: minutes,
                    zlevel: 100,
                    splitLine: {
                        show: true,
                        interval: 0,
                        lineStyle:{
                            color: ['rgba(255,255,255,1)'],
                            width: 1,
                            type: 'solid'
                        }
                　　},
                    axisTick: {
                        show: false
                    }
                },
                series: [{
                    name: 'Coding record',
                    type: 'heatmap',
                    data: data,
                    label: {
                        normal: {
                            show: false
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