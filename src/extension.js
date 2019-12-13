const vscode = require('vscode');

const util = require('./util');
const fs = require('fs');
const path = require('path');

const Status = {
	idle: 'idle',
	coding: 'coding',
	debug: 'debug'
}

const vsrecoder = {
	status: Status.idle,
	idleTimer: null,
	codingTimer: null,
	debugTimer: null,
	debugTracker: null,
	isCoding: false,
	isIdle: false,
	cleanRecord(context){
		let now = new Date()
		let day = util.dateFormat('YYYYmmdd',now)
		context.globalState.update(day, undefined)
	},
	getRecord(context,day){
		let data = context.globalState.get(day,[])
		return data
	},
	update(context,status){
		try {
			let now = new Date()
			let day = util.dateFormat('YYYYmmdd',now)
			let oldData = context.globalState.get(day,[])
			if(status==Status.idle && oldData.length>0 && oldData[oldData.length-1].type==Status.idle){
				return
			}
			oldData.push({
				type: status,
				time: now.getTime()
			})
			context.globalState.update(day, oldData)
		} catch (error) {
			util.showError(error)
		}
	},
	startDebug(context){
		this.isIdle = false
		if(this.status!=Status.debug){
			this.status = Status.debug
			if(this.debugTimer){
				clearInterval(this.debugTimer)
			}
			let debugInterval = vscode.workspace.getConfiguration().get("debugInterval",2*60)
			this.debugTimer = setInterval(() => {
				if(this.status==Status.debug){
					this.stopDebug(context)
				}
			}, debugInterval*1000);

			console.log("record debug")
			this.update(context,Status.debug)
		}
	},
	stopDebug(context){
		this.status === Status.idle
		this.isIdle = true
		if(this.debugTimer){
			clearInterval(this.debugTimer)
			this.debugTimer = null
		}
		if(this.debugTracker){
			this.debugTracker.dispose()
		}
	},
	startCoding(context){
		this.isCoding = true
		this.isIdle = false
		if(this.status!=Status.coding){
			this.status = Status.coding
			this.update(context,Status.coding)
			console.log(`record coding`)
			if(this.codingTimer){
				clearInterval(this.codingTimer)
			}
			let codingInterval = vscode.workspace.getConfiguration().get("codingInterval",1*60)
			this.codingTimer = setInterval(() => {
				if(this.status==Status.coding){
					if(this.isCoding){
						this.stopCoding(context)
					}
					this.isIdle = true
					this.isCoding = false
					this.status = Status.idle
				}
			}, codingInterval*1000);
		}
	},
	stopCoding(context){
		this.isCoding = false
		this.status = Status.idle
		if(this.codingTimer){
			clearInterval(this.codingTimer)
			this.codingTimer = null
		}
	},
	startIdle(context){
		this.status = Status.idle
		this.isIdle = true
		if(this.idleTimer){
			clearInterval(this.idleTimer)
		}

		let idleInterval = vscode.workspace.getConfiguration().get("idleInterval",30)
		this.idleTimer = setInterval(() => {
			let now = new Date()
			// console.log(`onIdle:${util.dateFormat('HH:MM:SS',now)},${this.status},isIdle:${this.isIdle},isCoding:${this.isCoding}`)
			if(this.status === Status.idle && this.isIdle){
				console.log(`record idle`)
				this.isIdle = false
				this.update(context,Status.idle)
			}
		}, idleInterval*1000);
	},
	stopIdleTimer(context){
		if(this.idleTimer){
			clearInterval(this.idleTimer)
			this.idleTimer = null
		}
	},
	deactivate(){
		this.stopCoding()
		this.stopIdleTimer()
		this.stopDebug()
	}
}
function getWebViewContent(context, templatePath) {
	const resourcePath = util.getExtensionFileAbsolutePath(context, templatePath);
	const dirPath = path.dirname(resourcePath);
	let html = fs.readFileSync(resourcePath, 'utf-8');
	html = html.replace(/(<link.+?href="|<script.+?src="|<img.+?src=")(.+?)"/g, (m, $1, $2) => {
			return $1 + vscode.Uri.file(path.resolve(dirPath, $2)).with({ scheme: 'vscode-resource' }).toString() + '"';
	});
	return html;
}

function invokeCallback(panel, message, resp) {
	console.log(`${message.cmd}`);
	if (typeof resp == 'object' && resp.code && resp.code >= 400 && resp.code < 600) {
			util.showError(resp.message || 'unknown error');
	}
	panel.webview.postMessage({cmd: 'vscodeCallback', cbid: message.cbid, data: resp});
}

const messageHandler = {
	getConfig(context,global, message) {
		const result = vscode.workspace.getConfiguration().get(message.key);
		invokeCallback(global.panel, message, result);
	},
	setConfig(context,global, message) {
		vscode.workspace.getConfiguration().update(message.key, message.value, true);
		util.showInfo('Setting updated');
	},

	getRecord(context,global, message){
		let day = message.day
		let result = vsrecoder.getRecord(context,day)
		invokeCallback(global.panel, message, result);
	}
};

function activate(context) {
	vsrecoder.startIdle(context)
	vscode.workspace.onDidChangeTextDocument(event => {
		vsrecoder.startCoding(context)
	})
	vscode.debug.onDidStartDebugSession(event => {
		vsrecoder.startDebug(context)
	})
	vscode.debug.onDidTerminateDebugSession(event => {
		vsrecoder.stopDebug(context)
	})
	vsrecoder.debugTracker = vscode.debug.registerDebugAdapterTrackerFactory('*',{
		createDebugAdapterTracker(session,executable){
			return {
				onDidSendMessage(msg){
				},
				onWillReceiveMessage(msg){
					vsrecoder.startDebug(context)
				},
				onWillStartSession(){
				},
				onWillStopSession(){
				}
			}
		}
	})

	context.subscriptions.push(vscode.commands.registerCommand('extension.vsrecoder.showRecord', function (){
		const panel = vscode.window.createWebviewPanel(
				'VSRecorder',
				"VSRecorder",
				vscode.ViewColumn.One,
				{
					enableScripts: true,
				}
		);

		let global = { panel};

		panel.webview.html = getWebViewContent(context, 'src/view/vsrecoder.html');
		panel.webview.onDidReceiveMessage(message => {
				if (messageHandler[message.cmd]) {
						messageHandler[message.cmd](context,global, message);
				} else {
						util.showError(`${message.cmd} not found`);
				}
		}, undefined, context.subscriptions)
	}))
}
exports.activate = activate;

function deactivate() {
	vsrecoder.deactivate()
}

module.exports = {
	activate,
	deactivate
}
