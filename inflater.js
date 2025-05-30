function inflate(data, config = {}) {
    let {approx, progress, notrim} = config;
    let report = Date.now();
    if (!approx)
        approx = data.length;
    let readpos = 0;
    let result = new Uint8Array(approx);
    let writepos = 0;

    let last;
    do {
        if (progress && Date.now() - report > 100) {
            progress(readpos, data.length * 8);
            report = Date.now();
        }
        last = readbit();
        let typ = readbits(2);
//                    console.log(last, typ);
        let litlenhuff, disthuff;
        switch (typ) {
            case 1:
                throw "no 1 yet";
            case 0:
                skipfrac();
                let len = readbits(16);
//                            console.log(len);
                if ((len ^ readbits(16)) !== 65535)
                    throw "Type0 len-nlen mismatch";
                while (len--)
//                                result.push(readbits(8));//!!
                    write(readbits(8));
                //result[writepos++] = readbits(8);//!!
                break;
            case 3:
                throw "Type3?";
            case 2:
                let numlitlens = readbits(5) + 257;
                let numdists = readbits(5) + 1;
                let numlencodes = readbits(4) + 4;
//                            console.log(numlitlens + "-" + numdists + "-" + numlencodes);
                let lens = [16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15];
                let lenlens = new Array(19).fill(0);
                for (let i = 0; i < numlencodes; i++)
                    lenlens[lens[i]] = readbits(3);
                let lenrake = rake(8);
                for (let i = 0; i < lenlens.length; i++)
                    lenrake[lenlens[i]].push(i);
                let lenhuff = huff(lenrake);
                {
                    let litlenrake = rake(16);
                    let distrake = rake(16);
                    let currrake = litlenrake;
                    let curr = 0;
                    let reps = 0;
                    let i = 0;
                    let cnt = 0;
                    while (cnt < numlitlens + numdists) {
                        if (reps <= 0) {
                            let code = readcode(lenhuff);
                            if (code < 16) {
                                curr = code;
                                reps = 1;
                            } else if (code === 16)
                                reps = readbits(2) + 3;
                            else if (code === 17) {
                                curr = 0;
                                reps = readbits(3) + 3;
                            } else if (code === 18) {
                                curr = 0;
                                reps = readbits(7) + 11;
                            } else
                                throw new Exception(code + ">18");
                        }
                        reps--;
                        currrake[curr].push(i++);
                        cnt++;
                        if (cnt === numlitlens) {
                            currrake = distrake;
                            i = 0;
                        }
                    }
                    litlenhuff = huff(litlenrake);
                    disthuff = huff(distrake);
                }
                while (true) {
                    let code = readcode(litlenhuff);
                    if (code === 256)
                        break;
                    if (code < 256) {
                        //result.push(code);
                        //result[writepos++] = code;
                        write(code);
//                                    console.log(String.fromCharCode(code));
                    } else {
                        let len;
                        if (code < 265)
                            len = code - 254;
                        else if (code === 285)
                            len = 258;
                        else {
                            code -= 261;
                            let bits = code >> 2;/// 4;
                            let mod = code & 3;//% 4;
                            len = (mod + 4) * (1 << bits) + 3 + readbits(bits);
                        }
//                                    console.log("Len:" + len);
//                            let dist = disthuff==null?
//                                    (Integer.reverse(readbits(5)) >>> 27):readcode(disthuff);
                        let dist = readcode(disthuff);
                        if (dist >= 4) {
                            dist -= 2;
                            let bits = dist >> 1;/// 2;
                            let mod = dist & 1;//% 2;
                            dist = (mod + 2) * (1 << bits) + readbits(bits);
                        }
                        dist++;
                        while (len-- > 0) {
                            write(result[writepos - dist]);
                        }
                    }
                }
        }
    } while (!last);
    console.log(readpos, data.length * 8);
    console.log(writepos);
    if (!notrim)
        resize(writepos);
    return notrim ? {result, length: writepos} : result;

    function readbit() {
        return (data[readpos >> 3] >> (readpos++ & 7) & 1);
    }
    function readbits(n) {
        let ret = 0, shift = 0;
        while (n-- > 0)
            ret += readbit() << shift++;
        return ret;
    }
    function skipfrac() {
        while (readpos & 7)
            readpos++;
    }
    function readcode(huff) {
        let code = 1;
        do {
            code = (code << 1) + readbit();
            if (code >= (1 << 20))
                throw "stream desync";
        } while (typeof huff[code] === "undefined");
        code = huff[code];
        return code;
    }
    function rake(n) {
        let ret = [];
        while (n-- > 0)
            ret.push([]);
        return ret;
    }
    function huff(rake) {
        rake[0] = [];
        let base = 0;
        let ret = [];
        for (let bits = 1; bits < rake.length; bits++) {
            base = (base + rake[bits - 1].length) << 1;
            let code = base + (1 << bits);
            for (let sym of rake[bits])
                ret[code++] = sym;
        }
        return ret;
    }

    function write(b) {
        if (writepos >= result.length)
            resize(result.length * 2);
        result[writepos++] = b;
    }
    function resize(len) {
        if (result.length === len)
            return;
        let realloc = new Uint8Array(len);
        if (len > result.length)
            for (let i = 0; i < result.length; i++)
                realloc[i] = result[i];
        else
            for (let i = 0; i < len; i++)
                realloc[i] = result[i];
        result = realloc;
    }
}
