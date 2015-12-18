var audioCtx = new (window.AudioContext || window.webkitAudioContext)();


var inputElement = document.getElementById("input");
var progressElement = document.getElementById("progress");
progressElement.style.display = "none";

inputElement.addEventListener("change", handleFiles, false);
function handleFiles() {
	progressElement.style.display = "block";
	var fileList = this.files;
	var file = this.files[0];
	var reader = new FileReader();
	reader.onload = function(e){
		audioCtx.decodeAudioData(e.target.result, function(decodedData){
			var tg = document.getElementById('spectrogram');
			var data = 	decodedData.getChannelData(0);
			var w = windows.hanning(1024);
			var N = 1024;
			var H = 256;
			var xmX, xpX;
			var x =  Array.prototype.slice.call(data);
			var result = stft.stftAnal(x, w, N, H);
			const datas = {xmX: result[0], xpX: result[1]};
			console.log(datas)
			spectrogramVisualization.spectrogramVisualization(datas, tg);
			progressElement.style.display = "none";
		})
		// .catch(function(err){
		// 	console.log(err);
		// });
	}
	reader.readAsArrayBuffer(file);
}

