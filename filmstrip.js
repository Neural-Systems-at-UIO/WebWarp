const fs_data = {
    iconmap: new Map,
    observer: new IntersectionObserver(loader),
    active: null
};

function fs_start() {
    fs_redraw();
    const idx = Math.floor(sections.length / 2);
    fs_activate({target: sections[idx].key.firstElementChild}, true);
}

function fs_prev() {
    if (fs_data.active && fs_data.active.previousSibling)
        fs_activate({target: fs_data.active.previousSibling.firstElementChild}, true);
}
function fs_next() {
    if (fs_data.active && fs_data.active.nextSibling)
        fs_activate({target: fs_data.active.nextSibling.firstElementChild}, true);
}

function fs_redraw() {
    const scroller = document.getElementById("stripscroller");
    const opacity = document.getElementById("fs_alpha").valueAsNumber / 100;

    for (const item of sections) {
        const div = document.createElement("div");
        fs_data.observer.observe(div);
        item.key = div;
        fs_data.iconmap.set(div, item);
        div.className = "icon";
        const icon = document.createElement("canvas");
        const overlay = document.createElement("canvas");
        overlay.onclick = fs_activate;
        overlay.style.opacity = opacity;
        overlay.className = "icnv";
        const w = icon.width = overlay.width = 128;
        const h = icon.height = overlay.height = 128 * item.height / item.width;
        div.appendChild(icon);
        div.appendChild(overlay);
        if(app===app_ww) {
            const checkbox = document.createElement("input");
            checkbox.type = "checkbox";
            checkbox.className = "icbx";
            checkbox.onclick = fs_done;
            if(item.wwdone){
                checkbox.checked=true;
                div.classList.add("done");
            }else{
                checkbox.checked=false;
                div.classList.add("notdone");
            }
            div.appendChild(checkbox);
        }
        scroller.appendChild(div);
        const ovly = slice(item.ouv);
        for (const cnv of [icon, overlay]) {
            const ctx = cnv.getContext("2d");
            ctx.drawImage(ovly, 0, 0, w, h);
        }
    }
}

function fs_done(event) {
    const target = event.target.parentElement;
    if(event.target.checked){
        target.classList.add("done");
        target.classList.remove("notdone");
        fs_data.iconmap.get(target).wwdone=true;
    }else{
        target.classList.add("notdone");
        target.classList.remove("done");
        delete fs_data.iconmap.get(target).wwdone;
    }
}

function fs_activate(event, scroll) {
    const target = event.target.parentElement;
    if (fs_data.active === target)
        return;
    if (fs_data.active)
        fs_data.active.classList.remove("active");
    fs_data.active = target;
    fs_data.active.classList.add("active");
    if (scroll)
        fs_data.active.scrollIntoView({block: "center"});
    dispatchSection(fs_data.iconmap.get(target));
}

function fs_ovly(event) {
    const opacity = event.target.valueAsNumber / 100;
    for (const cnv of document.getElementsByClassName("icnv")) {
        cnv.style.opacity = opacity;
    }
}

async function loader(entries) {
    for (const entry of entries)
        if (entry.isIntersecting) {
            const div = entry.target;
            fs_data.observer.unobserve(div);
            const image = fs_data.iconmap.get(div);
            let {width, height, maxlevel, tilesize} = image;
            var level = 0;
            while (width >= tilesize || height >= tilesize) {
                level++;
                width = (width + 1) >> 1;
                height = (height + 1) >> 1;
            }
            const icon = await getTile(image, maxlevel - level, 0, 0);
            div.firstElementChild.getContext("2d").drawImage(icon, 0, 0, 128, height * 128 / width);
        }
}

function fs_resize() {
    if (fs_data.active)
        fs_data.active.scrollIntoView({block: "center"});
}
