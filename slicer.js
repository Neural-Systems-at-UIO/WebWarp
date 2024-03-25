function dataslice(ouv,width,height){
    let [ox,oy,oz,ux,uy,uz,vx,vy,vz]=ouv;
    if(arguments.length===1){
        width=Math.round(Math.sqrt(ux*ux+uy*uy+uz*uz));
        height=Math.round(Math.sqrt(vx*vx+vy*vy+vz*vz));
    }
    let data=new Uint16Array(width*height);
    let xdim=atlas.xdim;
    let ydim=atlas.ydim;
    let zdim=atlas.zdim;
    let zslice=xdim*ydim;
    for(let y=0;y<height;y++){
        let hx=ox+vx*y/height;
        let hy=oy+vy*y/height;
        let hz=oz+vz*y/height;
        for(let x=0;x<width;x++){
            let lx=Math.round(hx+ux*x/width);
            let ly=Math.round(hy+uy*x/width);
            let lz=Math.round(hz+uz*x/width);
            if( (lx>=0) && (lx<xdim) && (ly>=0) && (ly<ydim) && (lz>=0) && (lz<zdim) )
                data[x+y*width]=atlas.blob[lx+ly*xdim+lz*zslice];
        }
    }
    return {data:data,width:width,height:height};
}

function slice(ouv){
    var data=dataslice(ouv);
    var canvas=document.createElement("canvas");
    var w=canvas.width=data.width;
    var h=canvas.height=data.height;
    var ctx=canvas.getContext("2d");
    var slice=ctx.createImageData(w,h);
    var slicedata=slice.data;
    var d=data.data;
    for(var i=0,j=0;i<d.length;i++){
        var lbl=atlas.labels[d[i]];
        slicedata[j++]=lbl.r;
        slicedata[j++]=lbl.g;
        slicedata[j++]=lbl.b;
        slicedata[j++]=255;
    }
    ctx.putImageData(slice,0,0);
//    return canvas;
    var ret=document.createElement("canvas");
    ret.width=128;
    ret.height=128*h/w;
    ret.getContext("2d").drawImage(canvas,0,0,ret.width,ret.height);
    return ret;
}

///////////////////////////////////////////////////////////////////////////

function grayslice(ouv,width,height){
    let [ox,oy,oz,ux,uy,uz,vx,vy,vz]=ouv;
    if(arguments.length===1){
        width=Math.round(Math.sqrt(ux*ux+uy*uy+uz*uz));
        height=Math.round(Math.sqrt(vx*vx+vy*vy+vz*vz));
    }
    let data=new Uint8Array(width*height);
    let xdim=atlas.xdim;
    let ydim=atlas.ydim;
    let zdim=atlas.zdim;
    let zslice=xdim*ydim;
    for(let y=0;y<height;y++){
        let hx=ox+vx*y/height;
        let hy=oy+vy*y/height;
        let hz=oz+vz*y/height;
        for(let x=0;x<width;x++){
            let lx=Math.round(hx+ux*x/width);
            let ly=Math.round(hy+uy*x/width);
            let lz=Math.round(hz+uz*x/width);
            if( (lx>=0) && (lx<xdim) && (ly>=0) && (ly<ydim) && (lz>=0) && (lz<zdim) )
                data[x+y*width]=gray[lx+ly*xdim+lz*zslice];
        }
    }
    return {data:data,width:width,height:height};
}

function drawslice(ouv,ctx,x,y,width,height,mode){
//    if(mode===0)return;
    let imagedata=ctx.getImageData(x,y,width,height);
    width=imagedata.width;
    height=imagedata.height;
    let slicedata=dataslice(ouv,width,height).data;
    let graydata=document.getElementById("modality").selectedIndex==1?grayslice(ouv,width,height).data:false;
    let pixeldata=imagedata.data;
    if(graydata){
        let contrast=document.getElementById("contrast").valueAsNumber;
        if(mode>0)
            mode=-100;
        let a=-mode;
        let a100=100+mode;
        let wh=width*height;
        for(let i=0;i<wh;i++)
            if(slicedata[i]>0){
                let j=i<<2;
                let ag=a*Math.min(255,graydata[i]*255/contrast);
                pixeldata[j]=(pixeldata[j]*a100+ag)/100;
                pixeldata[j+1]=(pixeldata[j+1]*a100+ag)/100;
                pixeldata[j+2]=(pixeldata[j+2]*a100+ag)/100;
                pixeldata[j+3]=255;
            }
    }else if(mode>=0){
        let r=mode>>16;
        let g=(mode>>8)&255;
        let b=mode&255;
        for(let y=1;y<height-1;y++)
            for(let x=1;x<width-1;x++){
                let i=x+y*width;
                let w=slicedata[i];
                if(w!==slicedata[i-1]
//                            || w!==slicedata[i+1]
                                || w!==slicedata[i-width]
//                                || w!==slicedata[i+width]
                        ){
                    pixeldata[i*4]=r;
                    pixeldata[i*4+1]=g;
                    pixeldata[i*4+2]=b;
                    pixeldata[i*4+3]=255;
                }
            }
    }else{
        let a=-mode;
        let a100=100+mode;
        let wh=width*height;
        for(let i=0;i<wh;i++){
            let w=slicedata[i];
            if(w>0){
                let l=atlas.labels[w];
                let j=i<<2;
                pixeldata[j]=(pixeldata[j]*a100+l.r*a)/100;
                pixeldata[j+1]=(pixeldata[j+1]*a100+l.g*a)/100;
                pixeldata[j+2]=(pixeldata[j+2]*a100+l.b*a)/100;
                pixeldata[j+3]=255;
            }
        }
    }
    ctx.putImageData(imagedata,x,y);
}

//function canvaslice(data){
//    let canvas=document.createElement("canvas");
//    let w=canvas.width=data.width;
//    let h=canvas.height=data.height;
//    let ctx=canvas.getContext("2d");
//    let slice=ctx.createImageData(w,h);
//    let slicedata=slice.data;
//    let d=data.data;
//    for(let i=0,j=0;i<d.length;i++){
//        let lbl=atlas.labels[d[i]];
//        slicedata[j++]=lbl.r;
//        slicedata[j++]=lbl.g;
//        slicedata[j++]=lbl.b;
//        slicedata[j++]=255;
//    }
//    ctx.putImageData(slice,0,0);
//    return canvas;
////    let ret=document.createElement("canvas");
////    ret.width=128;
////    ret.height=128*h/w;
////    ret.getContext("2d").drawImage(canvas,0,0,ret.width,ret.height);
////    return ret;
//}

//var voldata;
//function initvol(location,next){
//    console.log(location);
//    let start=Date.now();
////    var img=document.createElement("img");
////    img.onload=function(){
////        var canvas=document.createElement("canvas");
////        canvas.width=img.width;
////        canvas.height=img.height;
////        var ctx=canvas.getContext("2d");
////        ctx.drawImage(img,0,0);
////        voldata=ctx.getImageData(0,0,canvas.width,canvas.height).data;
////        next();
////    };
////    img.src=location;
//    var xhr=new XMLHttpRequest();
//    xhr.open("GET",location);
//    xhr.responseType="arraybuffer";
//    xhr.onload=function(){
//        let data=new Uint8Array(xhr.response);
//        console.log("Download",data.length,Date.now()-start);
//        data=inflate(data);
//        console.log("Deflate",data.length,Date.now()-start);
//        data=derle(data,atlas.encoding);
//        console.log("Decode",data.length,Date.now()-start);
//        voldata=data;
//        next();
//    };
//    xhr.send();
//}

