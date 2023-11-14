const args = JSON.parse(decodeURIComponent(location.search.substring(1)));
const bucket = args["clb-collab-id"];
const token = args.token;
const app = args.app;
const app_ww = "webwarp";
const app_lz = "localizoom";
const appext= {[app_ww]:".wwrp",[app_lz]:".lz"}[app];
let filename = args.filename;
//args.tools = args.nl = true;

async function dpurlget(bucketfile){
    return fetch(
        `https://data-proxy.ebrains.eu/api/v1/buckets/${bucketfile}?redirect=false`,
        {headers: {authorization: `Bearer ${token}`}}).then(response => response.json());
}

let sries;
let sections;
let atlas;

//function argspack(pack) {
//    return encodeURIComponent(JSON.stringify({
//        collab: args["clb-collab-id"],
//        token: args.token,
//        ...pack
//    }));
//}

async function getDescriptor() {
    const download = await dpurlget(bucket+"/"+filename);
    return fetch(download.url.includes("?") ? download.url : download.url + "?" + Date.now()).then(response => response.json());
}

async function getTile(section, level, x, y) {
    if(section.dzip) {
        const dzip=section.dzip;
        if(dzip === "loading"){
            const callback=section.callback;
            await new Promise(resolve=>{
                section.callback=resolve;
            });
            if(callback)
                callback();
        }
        if(typeof section.dzip === "string"){
            section.dzip="loading";
            section.dzip=await netunzip(()=>dpurlget(dzip).then(json=>json.url));
            if(section.callback)
                section.callback();
            delete section.callback;
        }
        const buffer=await section.dzip.get(section.dzip.entries.get(`${section.base}${level}/${x}_${y}.${section.format}`));
        const url=URL.createObjectURL(new Blob([buffer], {type: "image/"+section.format}));
        const tile = document.createElement("img");
        return new Promise(resolve=>{
            tile.onload = () => {
                URL.revokeObjectURL(url);
                resolve(tile);
            };
            tile.src = url;
        });
    }
    if(sries.hasOwnProperty("bucket")){
        const download = await dpurlget(`${sries.bucket}/${section.base}${level}/${x}_${y}.${section.format}`);
        return new Promise(resolve => {
            const tile = document.createElement("img");
            tile.onload = () => resolve(tile);
            tile.src = download.url;
        });
    }
    return new Promise(resolve => {
        const tile = document.createElement("img");
        tile.onload = () => resolve(tile);
        tile.src = `https://object.cscs.ch/v1/AUTH_08c08f9f119744cbbf77e216988da3eb/${sries.oldisv}/${section.base}${level}/${x}_${y}.${section.format}`;
    });
}

async function startup() {
    if(args.embedded)
        document.getElementById("btn_saveas").style.display="none";
    window.addEventListener("resize", fullscreen);
    fullscreen();

    popup("Loading data");
    sries = await getDescriptor();

    atlas = new Promise(resolve => new Worker("getlas.js?" + sries.atlas)
                .onmessage = event => {
                    if (event.data.hasOwnProperty("blob"))
                        resolve(event.data);
                    else
                        popup(event.data);
                });

    sections = JSON.parse(JSON.stringify(sries.sections));
    for (let section of sections) {
        const filename = section.filename;
        if(!filename.endsWith(".dzip")){
            section.name = filename.substring(0, filename.lastIndexOf("."));
            section.base = `${filename}/${section.name}_files/`;
        }else{
            section.dzip=`${sries.bucket}/.nesysWorkflowFiles/zippedPyramids/${filename}`;
            section.name=filename.slice(filename.lastIndexOf("/")+1,-".dzip".length);
            section.base=section.name+"_files/";
        }
        section.snr = parseInt(filename.match(/(?<=_s)\d+/));
        section.anchored = section.hasOwnProperty("ouv");
        let w = section.width, h = section.height, maxlevel = 0;
        while (w > 1 || h > 1) {
            w = (w + 1) >> 1;
            h = (h + 1) >> 1;
            maxlevel++;
        }
        section.maxlevel = maxlevel;
        if (!section.hasOwnProperty("markers"))
            section.markers = [];
        else
            section.markers = section.markers.map(m =>
                Array.isArray(m) ? {x: m[0], y: m[1], nx: m[2], ny: m[3]} : m);
        if (!section.hasOwnProperty("poi"))
            section.poi = [];
    }

    atlas = await atlas;
    atlas.blob = atlas.encoding === 1 ? new Uint8Array(atlas.blob) : new Uint16Array(atlas.blob);
    cover();
    propagate(sections, atlas);

//    if (args.view) {
//        fs_setalpha(0);
//    }
//    args.view = !args.tools;
//    args.prev = true;
//    if (args.view) {
//        document.getElementById("tools").style.display = "none";
//    } else {
        document.getElementById("tools").style.top = document.getElementById("status").offsetHeight + "px";
        switch(app) {
            case app_ww:
            document.getElementById("toggleNL").style.display = "inline";
            document.getElementById("btn_exprt").hidden=false;
                break;
            case app_lz:
//            document.getElementById("btn_exprt").style.display="none";
            document.getElementById("btn_excel").hidden=false;
            document.getElementById("toggleAN").style.display = "inline";
                break;
            default:
                throw app+"?";
        }
//    }
//    if (args.opacity) {
//        document.getElementById("alpha").value = args.opacity;
//        //document.getElementById("outline").value="#FFFFFF";
//    }

//                var xhr=new XMLHttpRequest();
//                xhr.open("GET",locators.AtlasLocator(args.atlas));
//                xhr.responseType="json";
//                xhr.onload=descriptorReady;
//                xhr.send();
//            }
//            function descriptorReady(event){
//                atlas=event.target.response;
//                for(var label of atlas.labels)
//                    if(label.rgb){
//                        label.r=parseInt(label.rgb.substr(0,2),16);
//                        label.g=parseInt(label.rgb.substr(2,2),16);
//                        label.b=parseInt(label.rgb.substr(4,2),16);
//                    }
    atlas.transformations.unshift({
        name: "File coords",
        matrix: [[1, 0, 0, 0], [0, 1, 0, 0], [0, 0, 1, 0], [0, 0, 0, 1]]
    });
    for (var trf of atlas.transformations) {
        var opt = document.createElement("option");
        opt.text = trf.name;
        document.getElementById("traf").appendChild(opt);
    }
    fs_start();
}

function fullscreen() {
    var zc = document.getElementById("zoomcanvas");
    var sc = document.getElementById("scroller");
//    sc.addEventListener("wheel", fs_mwheel, true);

    var help = document.getElementById("help");
    document.getElementById("metadata").style.top = help.style.top = zc.offsetTop + "px";
    help.style.left = window.innerWidth - 520 + "px";

    fs_setwidth(zc.width = sc.width = canvaswidth = window.innerWidth);
    fs_setheight(sc.height = 128 + 20);
    zc.height = canvasheight = window.innerHeight - zc.offsetTop - 128 - 20;
    if (zoomer)
        zoomer.home();
}

var overlay = document.createElement("canvas");
var overlaydata, overlayorg;
var overlaywidth;
var overlayheight;
var octx, omgdata, odta;

var pop = null;
var popscape = false;
var zoomer;
var cfg;

let current_section;
let markers,poi;
let ouv;
function dispatchSection(section) {
    current_section = section;
    markers = current_section.markers;
    poi = current_section.poi;
    ouv = section.ouv;
    var data = dataslice(section.ouv);
    var w = overlay.width = overlaywidth = data.width;
    var h = overlay.height = overlayheight = data.height;
    octx = overlay.getContext("2d");
    omgdata = octx.createImageData(w, h);
    odta = omgdata.data;
    overlaydata = new Uint16Array(w * h);
    //overlayorg=new Uint16Array(w*h);
    var d = overlayorg = data.data;
    for (var i = 0, is = 0; i < d.length; i++) {
        var col = atlas.labels[overlaydata[i] = d[i]];
        odta[is++] = col.r;
        odta[is++] = col.g;
        odta[is++] = col.b;
        odta[is++] = 255;
    }
    octx.putImageData(omgdata, 0, 0);

    cfg = {
        TileSize: section.tilesize,
        Overlap: section.overlap,
        Format: section.format,
        Width: section.width,
        Height: section.height,
        //FillStyle:"#00FF00",
        MaxLevel: section.maxlevel
    };

    triangulate();

    var meta = document.getElementById("metadata");
    meta.innerHTML = /*ouv.name*/section.name + "<br>" + cfg.Width.toString() + " x " + cfg.Height.toString() + "<br>"
            + atlas.name;
//            + (args.prev ? "" : ("<br><a href='http://cmbn-navigator.uio.no/navigator/feeder/original/?id=" + section_id + "' target='_blank'>Download image</a>"));
//    meta.style.left = window.innerWidth - meta.scrollWidth - 5 + "px";

//    var w = cfg.Width;
//    var h = cfg.Height;
//    while (w > 1 || h > 1) {
//        w = (w + 1) >> 1;
//        h = (h + 1) >> 1;
//        cfg.MaxLevel++;
//    }

//    cfg.Key = function (level, x, y) {
//        return locators.TileLocator(section_id, this.MaxLevel - level, x, y, cfg.Format);
//    };
    cfg.Load = async function (/*key, section, */level, x, y/*, next*/) {
        let tile = await getTile(section, section.maxlevel-level, x, y);
//        var img = document.createElement("img");
        var canvas = document.createElement("canvas");
        canvas.width = cfg.TileSize;
        canvas.height = cfg.TileSize;
        canvas.getContext("2d").drawImage(tile, x === 0 ? 0 : -cfg.Overlap, y === 0 ? 0 : -cfg.Overlap);
        return canvas;
//        next(canvas);
//        img.onload = function () {
//            canvas.getContext("2d").drawImage(img, x === 0 ? 0 : -cfg.Overlap, y === 0 ? 0 : -cfg.Overlap);
//            next(canvas);
//        };
//        img.onerror = function () {
//            console.log("Invalid tile? " + x + "," + y + " " + key);
//            next(canvas);
//        };
//        img.src = key;
    };
    cfg.Overlay = function (ctx, cw, ch, x, y, w, h) {
//                    var bright=parseInt(document.getElementById("bright").value);
//                    if(bright>1){
//                      var bdata=ctx.getImageData(0,0,cw,ch);
//                      var bdat=bdata.data;
//                      for(var i=0;i<cw*ch*4;i++)
//                        bdat[i]*=bright;
//                      ctx.putImageData(bdata,0,0);
//                    }
        var ovltrgx = 0;
        var ovltrgy = 0;
        var ovltrgw = cw;
        var ovltrgh = ch;
        var ovlcutx = overlay.width * x / cfg.Width;
        var ovlcuty = overlay.height * y / cfg.Height;
        var ovlcutw = overlay.width * w / cfg.Width;
        var ovlcuth = overlay.height * h / cfg.Height;
        if (ovlcutx < 0) {
            ovltrgx = -x * cw / w;
            ovlcutx = 0;
        }
        if (ovlcuty < 0) {
            ovltrgy = -y * ch / h;
            ovlcuty = 0;
        }
        if (ovlcutw > overlay.width) {
            ovltrgw -= (w - cfg.Width) * cw / w;
            ovlcutw = overlay.width;
        }
        if (ovlcuth > overlay.height) {
            ovltrgh -= (h - cfg.Height) * ch / h;
            ovlcuth = overlay.height;
        }
        var alpha = parseInt(document.getElementById("alpha").value);
        ctx.globalAlpha = alpha / 100;
        ctx.drawImage(overlay, ovlcutx, ovlcuty, ovlcutw, ovlcuth, ovltrgx, ovltrgy, ovltrgw, ovltrgh);
        ctx.globalAlpha = 1;

        if (show_triangles.checked) {
            for(const style of [["#000000",2.5],["#FFFFFF",0.75]]){
            ctx.strokeStyle = style[0];// "#000000";
            ctx.lineWidth = style[1];// 2.5;
            ctx.beginPath();
            triangles.forEach(function (triangle) {
                var v = vertices[triangle[2]];
                ctx.moveTo(
                        Math.round((v[0] - x) * cw / w) + 0.5,
                        Math.round((v[1] - y) * ch / h) + 0.5
                        );
                for (var i = 0; i < 3; i++) {
                    var v = vertices[triangle[i]];
                    ctx.lineTo(
                            Math.round((v[0] - x) * cw / w) + 0.5,
                            Math.round((v[1] - y) * ch / h) + 0.5
                            );
                }
            });
            ctx.stroke();
            }
        }
        switch(app) {
            case app_ww:
                ctx.strokeStyle = "#FFFF80";
                try {
                    ctx.strokeStyle = document.getElementById("nlcolor").value;
                } catch (ex) {
                }
                ctx.lineWidth = 2.5;
                ctx.beginPath();
                for (var i = 0; i < markers.length; i++) {
                    ctx.moveTo(Math.round((markers[i].x - x) * cw / w) + 0.5,
                            Math.round((markers[i].y - y) * ch / h) + 0.5);
                    var sx = Math.round((markers[i].nx - x) * cw / w) + 0.5;
                    var sy = Math.round((markers[i].ny - y) * ch / h) + 0.5;
                    ctx.lineTo(sx, sy);
                    ctx.moveTo(sx, sy - 10);
                    ctx.lineTo(sx, sy + 10);
                    ctx.moveTo(sx - 10, sy);
                    ctx.lineTo(sx + 10, sy);
                }
                ctx.stroke();
                break;
            case app_lz:
                ctx.strokeStyle = "#FFFF80";
                try {
                    ctx.strokeStyle = document.getElementById("ancolor").value;
                } catch (ex) {
                }
                ctx.lineWidth = 2.5;
                ctx.beginPath();
                for (var i = 0; i < poi.length; i++) {
                    var sx = Math.round((poi[i].x - x) * cw / w) + 0.5;
                    var sy = Math.round((poi[i].y - y) * ch / h) + 0.5;
                    ctx.moveTo(sx, sy - 10);
                    ctx.lineTo(sx, sy + 10);
                    ctx.moveTo(sx - 10, sy);
                    ctx.lineTo(sx + 10, sy);
                }
                ctx.stroke();
                break;
            default:
                throw app+"?";
            }
        if ((pop !== null) && (alpha !== 0)) {
            ctx.fillStyle = "rgb(" + pop.r + "," + pop.g + "," + pop.b + ")";
            if (popscape)
                ctx.fillRect(0, 0, cw, 60);
            else
                ctx.fillRect(0, ch - 60, cw, 60);
            ctx.font = "40px sans-serif";
            ctx.fillStyle = "#000000";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            if (popscape)
                ctx.fillText(pop.name, cw / 2, 30);
            else
                ctx.fillText(pop.name, cw / 2, ch - 30);
        }
    };
    var cursor = {
        screenx: 0, screeny: 0, imagex: 0, imagey: 0
    };
    var prevalpha;
    cfg.MouseMove = function (event, cw, ch, x, y, w, h) {
        cursor.screenx = event.offsetX;
        cursor.screeny = event.offsetY;
        var mx = cursor.imagex = Math.round(x + event.offsetX * w / cw);
        var my = cursor.imagey = Math.round(y + event.offsetY * h / ch);
        if (markerpick !== undefined) {
            switch(app) {
                case app_ww:
                markers[markerpick].nx = mx;
                markers[markerpick].ny = my;
                triangulate();
                break;
            case app_lz:
                poi[markerpick].x = mx;
                poi[markerpick].y = my;
                break;
            default:
                throw app+"?";
            }
            drawImage();
            return;
        }
        var jump = false;
        if (popscape && event.offsetY < ch / 3) {
            popscape = false;
            jump = true;
        }
        if (!popscape && event.offsetY > ch * 2 / 3) {
            popscape = true;
            jump = true;
        }
        var div = document.getElementById("coords");
        var nx = mx / cfg.Width;
        var ny = my / cfg.Height;
        //!! todo: nonlin
        var fx = ouv[0] + ouv[3] * nx + ouv[6] * ny;
        var fy = ouv[1] + ouv[4] * nx + ouv[7] * ny;
        var fz = ouv[2] + ouv[5] * nx + ouv[8] * ny;
        var trf = atlas.transformations[document.getElementById("traf").selectedIndex];
        var xyz1 = mult([[fx, fy, fz, 1]], trf.matrix)[0];
        div.innerText = "(x=" + xyz1[0].toPrecision(5) + " y=" + xyz1[1].toPrecision(5) + " z=" + xyz1[2].toPrecision(5) + ")";
        nx = Math.round(nx * overlaywidth);
        ny = Math.round(ny * overlayheight);
        var oldpop = pop;
        pop = null;
        if ((nx >= 0) && (nx < overlaywidth) && (ny >= 0) && (ny < overlayheight)) {
            pop = overlaydata[nx + ny * overlaywidth];
            pop = pop === 0 ? null : atlas.labels[pop];
        }
        if (oldpop !== pop || jump)
            drawImage();
    };
    var markerpick;
    cfg.MouseDown = function (event, cw, ch, x, y, w, h) {
//        if (args.view)
//            return false;
        markerpick = undefined;
        switch(app) {
            case app_ww:
            for (var i = 0; i < markers.length; i++) {
                var sx = Math.round((markers[i].nx - x) * cw / w) + 0.5;
                var sy = Math.round((markers[i].ny - y) * ch / h) + 0.5;
                if (event.offsetX > sx - 10 && event.offsetX < sx + 10 && event.offsetY > sy - 10 && event.offsetY < sy + 10)
                    markerpick = i;
            }
            break;
        case app_lz:
            for (var i = 0; i < poi.length; i++) {
                var sx = Math.round((poi[i].x - x) * cw / w) + 0.5;
                var sy = Math.round((poi[i].y - y) * ch / h) + 0.5;
                if (event.offsetX > sx - 10 && event.offsetX < sx + 10 && event.offsetY > sy - 10 && event.offsetY < sy + 10)
                    markerpick = i;
            }
                break;
            default:
                throw app+"?";
        }
        return markerpick !== undefined;
    };
    cfg.MouseUp = function (event, cw, ch, x, y, w, h) {
        markerpick = undefined;
    };
    cfg.KeyDown = function (event, cw, ch, x, y, w, h) {
        var alpha = document.getElementById("alpha");
        switch (event.key) {
            case "ArrowLeft":
                fs_prev();
                break;
            case "ArrowRight":
                fs_next();
                break;
            case "ArrowUp":
                if (prevalpha) {
                    alpha.value = prevalpha;
                    drawImage();
                }
                break;
            case "ArrowDown":
                if (alpha.value !== "0") {
                    prevalpha = alpha.value;
                    alpha.value = 0;
                    drawImage();
                }
                break;
            case "Delete":
//                if (!args.view) {
                    switch(app) {
                        case app_ww:
                    {
                        var idx = undefined;
                        for (var i = 0; i < markers.length; i++) {
                            var sx = Math.round((markers[i].x - x) * cw / w) + 0.5;
                            var sy = Math.round((markers[i].y - y) * ch / h) + 0.5;
                            if (cursor.screenx > sx - 8 && cursor.screenx < sx + 8 && cursor.screeny > sy - 8 && cursor.screeny < sy + 8)
                                idx = i;
                            var sx = Math.round((markers[i].nx - x) * cw / w) + 0.5;
                            var sy = Math.round((markers[i].ny - y) * ch / h) + 0.5;
                            if (cursor.screenx > sx - 8 && cursor.screenx < sx + 8 && cursor.screeny > sy - 8 && cursor.screeny < sy + 8)
                                idx = i;
                        }
                        if (idx !== undefined) {
                            markers.splice(idx, 1);
                            triangulate();
                            drawImage();
                        }
                    }
                    break;
                case app_lz:{
                        var idx = undefined;
                        for (var i = 0; i < poi.length; i++) {
                            var sx = Math.round((poi[i].x - x) * cw / w) + 0.5;
                            var sy = Math.round((poi[i].y - y) * ch / h) + 0.5;
                            if (cursor.screenx > sx - 8 && cursor.screenx < sx + 8 && cursor.screeny > sy - 8 && cursor.screeny < sy + 8)
                                idx = i;
                        }
                        if (idx !== undefined) {
                            poi.splice(idx, 1);
                            drawImage();
                        }
                    }
                break;
            default:
                throw app+"?";
                    
                }
                break;
            default:
                if (/*!args.view &&*/ cursor.imagex >= 0 && cursor.imagey >= 0 && cursor.imagex <= cfg.Width && cursor.imagey <= cfg.Height)
                    switch(app) {
                        case app_ww:
                    {
                        var D = [cursor.imagex, cursor.imagey];
                        for (var triangle of triangles) {
                            var ai = triangle[0];
                            var bi = triangle[1];
                            var ci = triangle[2];
                            var A = vertices[ai];
                            var B = vertices[bi];
                            var C = vertices[ci];
                            var uv1 = intri(A, B, C, D);
                            if (uv1) {
                                //                                        console.log(uv1);
                                if (ai >= 4)
                                    A = markers[ai - 4];
                                else
                                    A = {x: vertices[ai][0], y: vertices[ai][1]};
                                if (bi >= 4)
                                    B = markers[bi - 4];
                                else
                                    B = {x: vertices[bi][0], y: vertices[bi][1]};
                                if (ci >= 4)
                                    C = markers[triangle[2] - 4];
                                else
                                    C = {x: vertices[ci][0], y: vertices[ci][1]};
                                markers.push({
                                    x: A.x + (B.x - A.x) * uv1[0] + (C.x - A.x) * uv1[1],
                                    y: A.y + (B.y - A.y) * uv1[0] + (C.y - A.y) * uv1[1],
                                    nx: cursor.imagex,
                                    ny: cursor.imagey
                                });
                                //                                        console.log(markers[markers.length-1]);
                                D = false;
                                break;
                            }
                        }
                        if (D) {
                            //                                    console.log("!");
                            markers.push({x: cursor.imagex, y: cursor.imagey, nx: cursor.imagex, ny: cursor.imagey});
                        }
                        triangulate();
                        drawImage();
                    } break;
                case app_lz:
                        poi.push({x: cursor.imagex, y: cursor.imagey});
                        drawImage();
                break;
            default:
                throw app+"?";
                }
            }
    };
    if (zoomer)
        zoomer.destroy();
    zoomer = new Zoomer(document.getElementById("zoomcanvas"), cfg);
    zoomer.home();
}
function drawImage() {
    if (zoomer)
        zoomer.redraw();
}
function excel() {
    // todo: nonlin/canonicalize
    const sheets = [];
    for (const section of sections)
        if (section.poi.length) {
            const rows = [];
            const ouv = section.ouv;
            rows.push(["ID", section.name, , , "HIDE", "HIDE"]);
            rows.push(["Resolution", section.width, section.height]);
            rows.push([]);
            rows.push(["Anchor", "x", "y", "z"]);
            rows.push(["o", ouv[0], ouv[1], ouv[2]]);
            rows.push(["u", ouv[3], ouv[4], ouv[5]]);
            rows.push(["v", ouv[6], ouv[7], ouv[8]]);
            rows.push([]);
            if (atlas.transformations.length === 1) {
                rows.push(["Marker#", "x", "y", , "nx", "ny", "fx", "fy", "fz"]);
                for (const poi of section.poi) {
                    const line = rows.length + 1;
                    rows.push([
                        rows.length - 8, poi.x, poi.y, , `=B${line}/B2`, `=C${line}/C2`,
                        `=B5+B6*E${line}+B7*F${line}`,
                        `=C5+C6*E${line}+C7*F${line}`,
                        `=D5+D6*E${line}+D7*F${line}`
                    ]);
                }
            } else {
                for (let i = 0; i < 4; i++) {
                    const row = ["HIDE", , , , , , , , , ];
                    for (const trf of atlas.transformations.slice(1))
                        row.push(trf.matrix[i][0], trf.matrix[i][1], trf.matrix[i][2]);
                    rows.push(row);
                }
                const namerow = [, , , , , , ];
                const hdrrow = ["Marker#", "x", "y", , "nx", "ny", "fx", "fy", "fz"];
                for (const trf of atlas.transformations.slice(1)) {
                    namerow.push(undefined, undefined, undefined, trf.name);
                    hdrrow.push("tx", "ty", "tz");
                }
                rows.push(namerow, hdrrow);
                for (const poi of section.poi) {
                    const line = rows.length + 1;
                    const row = [rows.length - 13, poi.x, poi.y, , `=B${line}/B2`, `=C${line}/C2`,
                        `=B5+B6*E${line}+B7*F${line}`,
                        `=C5+C6*E${line}+C7*F${line}`,
                        `=D5+D6*E${line}+D7*F${line}`];
                    for (let trf = 1; trf < atlas.transformations.length; trf++) {
                        for (let i = 0; i < 3; i++) {
                            const col = row.length;
                            const c = col >= 26 ?
                                    String.fromCharCode(64 + Math.floor(col / 26)) + String.fromCharCode(65 + col % 26)
                                    : String.fromCharCode(65 + col);
                            row.push(`=G${line}*${c}9+H${line}*${c}10+I${line}*${c}11+${c}12`);
                        }
                    }
                    rows.push(row);
                }
            }
            sheets.push([section.name, ...rows]);
        }
    const xl = packxlsx(sheets);
    const url = URL.createObjectURL(xl);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename.substring(0, filename.lastIndexOf(".")) + ".xlsx";
    a.click();
    URL.revokeObjectURL(url);
}
function meshview() {
    allpoi[section_id] = poi;
//                let wnd=window.open("https://meshview.apps.hbp.eu?atlas=AMBA_CCFv3_root","MeshView #"+Date.now());
    let wnd = window.open("https://meshview.apps.hbp.eu?atlas=" + (args.atlas.startsWith("WHS") ? "WHS_SD_Rat_v2_39um" : "ABA_Mouse_CCFv3_2015_25um"), "MeshView #" + Date.now());
    let color = document.getElementById("ancolor").value.substring(1);
    let r = parseInt(color.substring(0, 2), 16);
    let g = parseInt(color.substring(2, 4), 16);
    let b = parseInt(color.substring(4, 6), 16);
    let message = [];
    for (let section of sections) {
        let markers = allpoi[section.id] || [];
        if (markers.length) {
            let triplets = [];
            for (let marker of markers) {
                let nx = marker.x / section.w;
                let ny = marker.y / section.h;
                let x = section.ox + section.ux * nx + section.vx * ny;
                let y = section.oy + section.uy * nx + section.vy * ny;
                let z = section.oz + section.uz * nx + section.vz * ny;
                triplets.push(x, y, z);
            }
            message.push({name: section.id, r, g, b, triplets});
        }
    }
    onmessage = () => {
        wnd.postMessage(message, "*");
    };
    return;
    //var wnd=window.open("about:blank","MeshView #"+Date.now());
    var d = wnd.document;
    d.write("<html><head><title>MeshView export</title><style>textarea{width:100%;height:80%}</style></head><body>");
    d.write("Please copy the coordinates below into <a href='http://www.nesys.uio.no/MeshGen/MeshView.html?bitlas="
            + JSON.parse('{"100000":"ABAMouseHier","200000":"WHSRatV2","300000":"ABAv3-Hier"}')[args.atlas]
            + ".bitlas' target='_blank'>MeshView</a>. Viewer needs Adobe Flash.");
    if (args.atlas === "100000")
        d.write("<br>(Hint: \"Basic cell groups and regions\" is the gray wrapper structure to be switched off)");
    if (args.atlas === "300000")
        d.write("<br>(Hint: \"root\" is the gray wrapper structure to be switched off)");
    d.write("<textarea id='ta'>");
    d.write("RGB 0 0 1\n");
    d.write("SCALE 5\n");
    filmstrip.getmeta().forEach(function (section) {
        var markers = allpoi[section.id] || [];
        if (markers.length) {
            d.write("\n# " + section.name + "\n");
            markers.forEach(function (marker) {
                var nx = marker.x / section.w;
                var ny = marker.y / section.h;
                var x = section.ox + section.ux * nx + section.vx * ny;
                var y = section.oy + section.uy * nx + section.vy * ny;
                var z = section.oz + section.uz * nx + section.vz * ny;
                if (args.atlas === "100000") {
                    y -= 528;
                    z -= 320;
                }
                d.write(x.toFixed(0) + " " + y.toFixed(0) + " " + z.toFixed(0) + "\n");
            });
        }
    });
    d.write("</textarea></body></html>");
    d.close();
}

function metaReady(metahack, callback) {
    loadMarkers(metahack);
    callback();
//                var xhr=new XMLHttpRequest();
//                xhr.open("GET",args.series+".json");
////                xhr.responseType="json";
//                xhr.onload=xhr.onerror=function(){
//                    if(xhr.status===200)
//                        loadMarkers(xhr.responseText);
//                    callback();
//                };
//                xhr.send();
}

function loadMarkers(data) {
    var meta = filmstrip.getmeta();
    allmarkers = {};
    var uglymeta = {};
//                data=JSON.parse(data);
    if (Array.isArray(data)) { // own format
        meta.forEach(function (m) {
            uglymeta[m.id] = m;
            delete m.vam;
        });
        data.forEach(function (section) {
            var id = section.id;
            var meta = uglymeta[id];
            meta.w = section.w;
            meta.h = section.h;
            allmarkers[id] = section.markers;
        });
    } else { // VisuAlign format
        var r = /_s(\d+)/;
        meta.forEach(function (m) {
            uglymeta[m.s/*allnumbered?m.s:m.name*/] = m;
        });
        data.slices.forEach(function (section) {
            var name = section.filename;
            if (name) {
//                        name=name.substring(0,name.lastIndexOf("."));
                //var meta=uglymeta[name];
                var meta = uglymeta[section.hasOwnProperty("nr") ? section.nr : /*allnumbered?*/parseInt(r.exec(name)[1])/*:name.substring(0,name.lastIndexOf("."))*/];
                if (!meta) {
                    var frag = name.substring(0, name.lastIndexOf("."));
                    filmstrip.getmeta().forEach(function (m) {
                        if (m.name.indexOf(frag) >= 0)
                            meta = m;
                    });
                }
                //var meta=uglymeta[allnumbered?parseInt(section.nr):name.substring(0,name.lastIndexOf("."))];
                if (section.markers && meta) {
                    meta.vaw = section.width;
                    meta.vah = section.height;
                    meta.vam = section.markers;
                    var ouv = section.anchoring;
                    meta.ox = ouv[0];
                    meta.oy = ouv[1];
                    meta.oz = ouv[2];
                    meta.ux = ouv[3];
                    meta.uy = ouv[4];
                    meta.uz = ouv[5];
                    meta.vx = ouv[6];
                    meta.vy = ouv[7];
                    meta.vz = ouv[8];
                }
//                            allmarkers[meta.id]=section.markers.map(function(marker){
//                                return {x:marker[0],y:marker[1],nx:marker[2],ny:marker[3]};
//                            });
            }
        });
        visualign();
    }
}

//function visualign() {
//    var hide = false;
//    filmstrip.getmeta().forEach(function (meta) {
//        if (meta.vam) {
//            if (!meta.w)
//                hide = true;
//            else {
//                allmarkers[meta.id] = meta.vam.map(function (marker) {
//                    return {
//                        x: marker[0], //*meta.w/meta.vaw,
//                        y: marker[1], //*meta.h/meta.vah,
//                        nx: marker[2], //*meta.w/meta.vaw,
//                        ny: marker[3]/**meta.h/meta.vah*/};
//                });
//                delete meta.vam;
//            }
//        }
//    });
//    document.getElementById("btn_save").disabled = hide;
//}

function load() {
    var data = prompt("LocaliZoom nonlinear JSON", "");
    if (data === null || data === "")
        return;
    loadMarkers(data);
    markers = allmarkers[section_id] || [];
    triangulate();
    drawImage();
}
//function save() {
////    if (section_id)
////        allmarkers[section_id] = markers;
////    var meta = filmstrip.getmeta();
////    var data = [];
////    meta.forEach(function (section) {
////        var smarkers = allmarkers[section.id];
////        if (smarkers && smarkers.length) {
////            data.push({id: section.id, w: section.w, h: section.h, markers: smarkers});
////        }
////    });
////    var win = window.open("about:blank", "LZSave #" + Date.now());
////    var d = win.document.open();
////    d.write(JSON.stringify(data));
////    d.close();
//    for (let i = 0; i < sries.sections.length; i++)
//        if (sections[i].markers.length)
//            sries.sections[i].markers = sections[i].markers;
//        else
//            delete sries.sections[i].markers;
//}
async function save(){
    if(args.embedded || filename.endsWith(appext))
        dosave();
    else
        saveas();
}
async function saveas(){
    const choice=await dppick({
        bucket,
        token,
        title:"Save as...",
        path:filename.substring(0,filename.lastIndexOf("/")+1),
        extensions:[appext],
        create:appext,
        createdefault:filename.slice(filename.lastIndexOf("/")+1,filename.lastIndexOf("."))+appext,
        createbutton:"Save"
    });
    if(choice.cancel)
        return;
    filename=choice.create || choice.pick;
    dosave();
}
async function dosave(){
    switch(app) {
        case app_ww:
            for (let i = 0; i < sries.sections.length; i++)
                if (sections[i].markers.length)
                    // sries.sections[i].markers = sections[i].markers;
                    sries.sections[i].markers = sections[i].markers.map(m => [m.x, m.y, m.nx, m.ny]);
                else
                    delete sries.sections[i].markers;
                break;
            case app_lz:
            for (let i = 0; i < sries.sections.length; i++)
                if (sections[i].poi.length)
                    sries.sections[i].poi = sections[i].poi;
                else
                    delete sries.sections[i].poi;
                break;
    }

    const upload = await fetch(
            `https://data-proxy.ebrains.eu/api/v1/buckets/${bucket}/${filename}`, {
                method: "PUT",
                headers: {
                    authorization: `Bearer ${token}`
                }
            }
    ).then(response => response.json());
    if (!upload.hasOwnProperty("url")) {
        alert("Can't save: " + JSON.stringify(upload));
        return;
    }
    await fetch(upload.url, {
        method: "PUT",
        headers: {
            "Content-Type": "application/x." + app
        },
        body: JSON.stringify(sries)
    });
}


function toggleHelp() {
    var helpstyle = document.getElementById("help").style;
    helpstyle.display = helpstyle.display === "block" ? "none" : "block";
}
//            function toggleTools(){
//                var toolstyle=document.getElementById("toolsinner").style;
//                toolstyle.display=toolstyle.display==="inline-block"?"none":"inline-block";
//            }
function toggleAN() {
    var toolstyle = document.getElementById("antools").style;
    toolstyle.display = toolstyle.display === "inline-block" ? "none" : "inline-block";
}
function toggleNL() {
    var toolstyle = document.getElementById("nltools").style;
    toolstyle.display = toolstyle.display === "inline-block" ? "none" : "inline-block";
}
function handleOvly(event) {
    if (event.target.type === "color")
        document.getElementById("alpha").value = 100;
    triangulate();
    drawImage();
}

function popup(pop) {
    let cover = document.getElementById("cover");
    let popup = document.getElementById("popup");
    cover.hidden = popup.hidden = false;
    cover.style.display = popup.style.display = "block";
    document.getElementById("popcont").innerHTML = pop;
}
function cover() {
    let cover = document.getElementById("cover");
    let popup = document.getElementById("popup");
    cover.hidden = popup.hidden = true;
    cover.style.display = popup.style.display = "none";
}

async function exprt() {
    let date = new Date();
    let te = new TextEncoder();

    let ziplist = [];

    let descriptor = {
        target: sries.atlas,
        slices: sections.map(section => ({filename: section.filename, width: section.width, height: section.height, anchoring: section.ouv}))
    };
    ziplist.push({
        name: "anchorings.json",
        date,
        data: te.encode(JSON.stringify(descriptor, null, 1))
    });

    for (let i = 0; i < sections.length; i++) {
        let section = sections[i];
        popup(`${i + 1}/${sections.length} ${section.filename}`);

        let slice = dataslice(section.ouv);

        slice.aid = sries.atlas;
        ziplist.push({
            name: section.name + ".seg",
            date,
            data: segrle(slice)
        });

        let canvas = document.createElement("canvas");
        canvas.width = slice.width;
        canvas.height = slice.height;
        let ctx = canvas.getContext("2d");
        let idata = ctx.createImageData(slice.width, slice.height);
        let data = idata.data;
        for (let pos = 0; pos < slice.data.length; pos++) {
            let v = slice.data[pos];
            if (v !== 0) {
                let l = atlas.labels[v];
                data[pos * 4] = l.r;
                data[pos * 4 + 1] = l.g;
                data[pos * 4 + 2] = l.b;
                data[pos * 4 + 3] = 255;
            }
        }
        ctx.putImageData(idata, 0, 0);
        ziplist.push({
            name: section.name + ".png",
            date,
            data: new Uint8Array(await new Promise(resolve => canvas.toBlob(blob => resolve(blob.arrayBuffer()))))
        });
    }

    let zipfile = zipstore(ziplist);

    const choice = await dppick({
        bucket,
        token,
        title: "Export overlays...",
        path: filename.substring(0, filename.lastIndexOf("/") + 1),
        extensions: [".zip"],
        create: ".zip",
        createdefault: filename.slice(filename.lastIndexOf("/") + 1, filename.lastIndexOf(".")) + ".zip",
        createbutton: "Export"
    });
    if (choice.cancel) {
        cover();
        return;
    }
    let zipname = choice.create || choice.pick;

    popup("Uploading overlays");
    let upload = await fetch(
            `https://data-proxy.ebrains.eu/api/v1/buckets/${bucket}/${zipname}`, {
                method: "PUT",
                headers: {
                    accept: "application/json",
                    authorization: `Bearer ${token}`
                }
            }
    ).then(response => response.json());
    if (!upload.hasOwnProperty("url")) {
        alert("Can't save: " + JSON.stringify(upload));
        return;
    }
    await fetch(upload.url, {
        method: "PUT",
        headers: {
            'Content-Type': 'application/zip'
        },
        body: zipfile
    });
    cover();
}
