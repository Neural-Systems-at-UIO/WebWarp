function meshview_json() {
    const color = document.getElementById("ancolor").value.substring(1);
    const r = parseInt(color.substring(0, 2), 16);
    const g = parseInt(color.substring(2, 4), 16);
    const b = parseInt(color.substring(4, 6), 16);
    const alltriplets = [];
    for (const section of sections) {
        const poi = section.poi;
        if (poi.length) {
            const triplets = processSection(section, poi);
            alltriplets.push(...triplets);
        }
    }
    const name = filename.substring(filename.lastIndexOf("/") + 1, filename.lastIndexOf("."));
    const cloud = [{
            name, r, g, b, triplets: alltriplets
        }];
    const url = URL.createObjectURL(new Blob([JSON.stringify(cloud)]));
    const a = document.createElement("a");
    a.href = url;
    a.download = name + "-mv.json";
    a.click();
    URL.revokeObjectURL(url);
}

function processSection(section, pois) {
    const vertices = [
        [-section.width / 10, -section.height / 10, -section.width / 10, -section.height / 10],
        [section.width * 1.1, -section.height / 10, section.width * 1.1, -section.height / 10],
        [-section.width / 10, section.height * 1.1, -section.width / 10, section.height * 1.1],
        [section.width * 1.1, section.height * 1.1, section.width * 1.1, section.height * 1.1]];
    const triangles = [[0, 1, 2], [1, 2, 3]];
    // i<j j*(j-1)/2+i
    const ix = (i, j) => j * (j - 1) / 2 + i;
    const edges = [2, 2, 2, 0, 2, 2];

    for (const marker of section.markers) {
        const D = [marker.nx, marker.ny];
        let found = false;
        const remove = [];
        for (let i = 0; i < triangles.length; i++) {
            const triangle = triangles[i];
            const A = vertices[triangle[0]];
            const B = vertices[triangle[1]];
            const C = vertices[triangle[2]];
            if (!found && intri(A, B, C, D))
                found = true;
            if (incirc(A, B, C, D))
                remove.unshift(i);
        }
        if (found) {
            for (const i of remove) {
                const triangle = triangles.splice(i, 1)[0];
                const A = triangle[0];
                const B = triangle[1];
                const C = triangle[2];
                edges[ix(A, B)]--;
                edges[ix(A, C)]--;
                edges[ix(B, C)]--;
            }
            const es = [];
            for (let j = 1; j < vertices.length; j++)
                for (let i = 0; i < j; i++)
                    if (edges[ix(i, j)] === 1) {
                        triangles.push([i, j, vertices.length]);
                        es.push([i, j], [i, vertices.length], [j, vertices.length]);
                    }
            for (var e of es)
                edges[ix(e[0], e[1])] = 2; //..
            vertices.push([marker.nx, marker.ny, marker.x, marker.y]);
        }
    }

    for (const triangle of triangles) {
        const A = vertices[triangle[0]];
        const B = vertices[triangle[1]];
        const C = vertices[triangle[2]];
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

    const triplets = [];
    for (const poi of pois) {
        const x = poi.x;
        const y = poi.y;
        for (const triangle of triangles)
            if (x >= triangle[3] && x <= triangle[4] && y >= triangle[5] && y <= triangle[6]) {
                const uv1 = mult([[x, y, 1]], triangle[7])[0];
                if (uv1[0] >= 0 && uv1[0] < 1 && uv1[1] >= 0 && uv1[1] < 1 && uv1[0] + uv1[1] <= 1) {
                    const A = vertices[triangle[0]];
                    const B = vertices[triangle[1]];
                    const C = vertices[triangle[2]];
                    const nx = A[2] + (B[2] - A[2]) * uv1[0] + (C[2] - A[2]) * uv1[1];
                    const ny = A[3] + (B[3] - A[3]) * uv1[0] + (C[3] - A[3]) * uv1[1];
                    const x = section.ouv[0] + section.ouv[3] * nx / section.width + section.ouv[6] * ny / section.height;
                    const y = section.ouv[1] + section.ouv[4] * nx / section.width + section.ouv[7] * ny / section.height;
                    const z = section.ouv[2] + section.ouv[5] * nx / section.width + section.ouv[8] * ny / section.height;
                    triplets.push(x, y, z);
                    break;
                }
            }
    }
    return triplets;
}
