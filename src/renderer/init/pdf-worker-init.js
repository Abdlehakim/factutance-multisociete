(function(w){
  var lib=w.pdfjsLib;if(!lib||!lib.GlobalWorkerOptions)return;
  var base=document.baseURI||location.href;
  lib.GlobalWorkerOptions.workerSrc=new URL("./lib/pdfs/pdf.worker.min.js",base).href;
  lib.GlobalWorkerOptions.cMapUrl=new URL("./lib/pdfs/cmaps/",base).href;
  lib.GlobalWorkerOptions.standardFontDataUrl=new URL("./lib/pdfs/standard_fonts/",base).href;
})(window);
