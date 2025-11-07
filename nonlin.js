var vertices;
var triangles;
function triangulate() {
//    vertices = [[0, 0], [cfg.Width, 0], [0, cfg.Height], [cfg.Width, cfg.Height]];
    vertices = [
        [-cfg.Width / 10, -cfg.Height / 10, -cfg.Width / 10, -cfg.Height / 10],
        [cfg.Width * 1.1, -cfg.Height / 10, cfg.Width * 1.1, -cfg.Height / 10],
        [-cfg.Width / 10, cfg.Height * 1.1, -cfg.Width / 10, cfg.Height * 1.1],
        [cfg.Width * 1.1, cfg.Height * 1.1, cfg.Width * 1.1, cfg.Height * 1.1]];
    triangles = [[0, 1, 2], [1, 2, 3]];
    // i<j j*(j-1)/2+i
    function ix(i, j) {
        return j * (j - 1) / 2 + i;
    }
//                var edges=new Array((markers.length+4)*(markers.length+5)/2).fill(0);
    var edges = [2, 2, 2, 0, 2, 2];

//    var smallorg = [[0, 0], [overlaywidth - 1, 0], [0, overlayheight - 1], [overlaywidth - 1, overlayheight - 1]];
    var smallorg = [// todo: get rid of it
        [-overlaywidth / 10, -overlayheight / 10],
        [(overlaywidth - 1) * 1.1, -overlayheight / 10],
        [-overlaywidth / 10, (overlayheight - 1) * 1.1],
        [(overlaywidth - 1) * 1.1, (overlayheight - 1) * 1.1]];
//    var small = [[0, 0], [overlaywidth - 1, 0], [0, overlayheight - 1], [overlaywidth - 1, overlayheight - 1]];
    var small = [
        [-overlaywidth / 10, -overlayheight / 10],
        [(overlaywidth - 1) * 1.1, -overlayheight / 10],
        [-overlaywidth / 10, (overlayheight - 1) * 1.1],
        [(overlaywidth - 1) * 1.1, (overlayheight - 1) * 1.1]];

    for (var marker of current_section.markers) {
        var D = [marker.nx, marker.ny];
        var found = false;
        var remove = [];
        for (var i = 0; i < triangles.length; i++) {
            var triangle = triangles[i];
            var A = vertices[triangle[0]];
            var B = vertices[triangle[1]];
            var C = vertices[triangle[2]];
            if (!found && intri(A, B, C, D))
                found = true;
            if (incirc(A, B, C, D))
                remove.unshift(i);
        }
        if (found) {
            for (var i of remove) {
                var triangle = triangles.splice(i, 1)[0];
                var A = triangle[0];
                var B = triangle[1];
                var C = triangle[2];
                edges[ix(A, B)]--;
                edges[ix(A, C)]--;
                edges[ix(B, C)]--;
            }
            var es = [];
            for (var j = 1; j < vertices.length; j++)
                for (var i = 0; i < j; i++)
                    if (edges[ix(i, j)] === 1) {
                        triangles.push([i, j, vertices.length]);
                        es.push([i, j], [i, vertices.length], [j, vertices.length]);
                    }
//                        console.log(es);
//                        console.log(edges.toString());
            for (var e of es)
                edges[ix(e[0], e[1])] = 2; //..
//                        console.log(edges.toString());
            vertices.push(D);
            smallorg.push([marker.x * overlaywidth / cfg.Width, marker.y * overlayheight / cfg.Height]);
            small.push([marker.nx * overlaywidth / cfg.Width, marker.ny * overlayheight / cfg.Height]);
        }
    }

    for (var triangle of triangles) {
        var A = small[triangle[0]];
        var B = small[triangle[1]];
        var C = small[triangle[2]];
        triangle.push(
                Math.min(A[0], B[0], C[0]), //3
                Math.max(A[0], B[0], C[0]), //4
                Math.min(A[1], B[1], C[1]), //5
                Math.max(A[1], B[1], C[1]), //6
                inv3x3([//7
                    [B[0] - A[0], B[1] - A[1], 0],
                    [C[0] - A[0], C[1] - A[1], 0],
                    [A[0], A[1], 1]
                ]));
    }

    var i = 0, pi = 0;
    var c = [[0, 0, 1]];
    odta = omgdata.data;
//                var color=show_outline.value!=="#ffffff" && show_outline.value;
    var color = document.getElementById("alpha").value === "100" && document.getElementById("outline").value;
    if (color) {
        color = [
            parseInt(color.substring(1, 3), 16),
            parseInt(color.substring(3, 5), 16),
            parseInt(color.substring(5, 7), 16)
        ];
    }
    for (var y = 0; y < overlayheight; y++) {
        c[0][1] = y;
        for (var x = 0; x < overlaywidth; x++) {
            c[0][0] = x;
            var found = false;
            for (var triangle of triangles)
                if (x >= triangle[3] && x <= triangle[4] && y >= triangle[5] && y <= triangle[6]) {
                    var uv1 = mult(c, triangle[7])[0];
                    if (uv1[0] >= 0 && uv1[0] < 1 && uv1[1] >= 0 && uv1[1] < 1 && uv1[0] + uv1[1] <= 1) {
                        var A = smallorg[triangle[0]];
                        var B = smallorg[triangle[1]];
                        var C = smallorg[triangle[2]];
                        var xx = Math.round(A[0] + (B[0] - A[0]) * uv1[0] + (C[0] - A[0]) * uv1[1]);
                        var yy = Math.round(A[1] + (B[1] - A[1]) * uv1[0] + (C[1] - A[1]) * uv1[1]);
                        var id = overlayorg[xx + yy * overlaywidth] || 0; //!!?? hack, todo 7608 (9?)
                        overlaydata[i++] = id;
                        if (id !== 0) {
                            var l = atlas.labels[id];
                            //                                    try{
                            odta[pi++] = l.r;
                            //                                }catch(e){
                            //                                    console.log(uv1,xx,yy,id);
                            //                                }
                            odta[pi++] = l.g;
                            odta[pi++] = l.b;
                            odta[pi++] = 255;
                        } else {
                            odta[pi++] = odta[pi++] = odta[pi++] = odta[pi++] = 0;
                        }
                        found = true;
                        break;
                    }
                }
            if (!found) {
                overlaydata[i++] = 0;
                odta[pi++] = 0;
                odta[pi++] = 0;
                odta[pi++] = 0;
                odta[pi++] = 0;
            }
            if (color) {
                if (x === 0 || y === 0 || (overlaydata[i - 1] === overlaydata[i - 2] && overlaydata[i - 1] === overlaydata[i - 1 - overlaywidth]))
                    odta[pi - 1] = odta[pi - 2] = odta[pi - 3] = odta[pi - 4] = 0;
                else {
                    odta[pi - 4] = color[0];
                    odta[pi - 3] = color[1];
                    odta[pi - 2] = color[2];
                    odta[pi - 1] = 255;
                }
            }
        }
    }
    octx.putImageData(omgdata, 0, 0);
}
