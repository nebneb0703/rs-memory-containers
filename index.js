function set_theme(is_dark) {
    const html = document.documentElement.classList;

    if (is_dark) {
        html.add("theme-dark");
        html.remove("theme-light");
    } else {
        html.add("theme-light");
        html.remove("theme-dark");
    }
}

function init_theme() {
    const stored = localStorage.getItem("theme");

    if (stored) {
        set_theme(stored == "dark");
        return;
    }

    const theme = window.matchMedia("(prefers-color-scheme: dark)");

    set_theme(theme.matches);
    theme.addEventListener("change", event => set_theme(event.matches));
}

function toggle_theme() {
    const html = document.documentElement.classList;

    html.toggle("theme-light");
    html.toggle("theme-dark");

    localStorage.setItem("theme", html.contains("theme-dark") ? "dark" : "light");
}

init_theme();

const selected_choices = {};

const questions = [
    {
        question: "Do you need an owned or shared container?",
        choices: [
            {
                text: "Owned",
                hint: "The data stored in this type of container is owned by exactly one instance of this container. "
                    + "You will still need to borrow this container in order to access the inner data.",
                select: () => selected_choices["shared"] = false,
            },
            {
                text: "Shared",
                hint: "This container can share a single instance of your data in multiple locations. The lifetime of "
                    + "your data is managed internally.",
                select: () => selected_choices["shared"] = true,
            },
        ],
    },

    {
        question: "Do you need interior mutability?",
        hint: "Interior mutability means you can modify the contained data without needing "
            + "mutable access, such as via an owned <span class='code'>mut</span> binding or "
            + "a <span class='code'>&mut</span> borrow.",
        choices: [
            {
                text: "Yes",
                select: () => selected_choices["interior_mut"] = true,
                next_question: () => {
                    if (selected_choices["shared"])
                        return 3;
                    else {
                        // Stupid if multi-threaded.
                        selected_choices["sync"] = false;
                        return 4;
                    };
                },
            },
            {
                text: "No",
                select: () => selected_choices["interior_mut"] = false,
                next_question: () => selected_choices["shared"] ? 3 : 2,
            },
        ],
    },

    {
        question: "Stack or heap allocated?",
        choices: [
            {
                // mut T
                text: "Stack",
                select: () => selected_choices["heap"] = false,
                next_question: () => -2, // Break
            },
            {
                // mut Box<T>
                text: "Heap",
                select: () => selected_choices["heap"] = true,
                next_question: () => -2, // Break
            },
        ],
    },

    {
        question: "Single- or Multi-threaded?",
        choices: [
            {
                text: "Single-threaded",
                select: () => selected_choices["sync"] = false,
                next_question: () => selected_choices["interior_mut"] ? 4 : -2 // Rc<T>, Break,
            },
            {
                text: "Multi-threaded",
                select: () => selected_choices["sync"] = true,
                next_question: () => selected_choices["interior_mut"] ? 5 : -2 // Arc<T>, Break,
            },
        ],
    },

    {
        question: "Do you need to borrow the contained data, or is copying/moving sufficient?",
        choices: [
            {
                // RefCell<T>
                text: "Borrow",
                select: () => selected_choices["borrow"] = true,
                next_question: () => -2, // Break
            },
            {
                // Cell<T>
                text: "Copy/Move",
                select: () => selected_choices["borrow"] = false,
                next_question: () => -2, // Break
            },
        ],
    },

    {
        question: "Which will happen more frequently, reading the data or modifying the data?",
        choices: [
            {
                // RwLock<T>
                text: "Reading",
                select: () => selected_choices["mainly_read"] = true,
                next_question: () => -2, // Break
            },
            {
                // Mutex<T>
                text: "Modifying",
                select: () => selected_choices["mainly_read"] = false,
                next_question: () => -2, // Break
            },
        ],
    },
];

const comments = {
    "Box":
"<span class='code smart-pointer'>Box</span> \
(<span class='code'><a href='https://doc.rust-lang.org/std/boxed/struct.Box.html' target='_blank'>std::boxed::<span class='smart-pointer'>\
Box</span></a></span>) is a <span class='smart-pointer'>smart pointer</span> that provides <em>owned</em> access to the inner data. This \
type is thread-safe if and only if the inner type is also thread-safe (implements <span class='code'>\
<a href='https://doc.rust-lang.org/std/marker/trait.Send.html' target='_blank'>Send</a></span> and <span class='code'>\
<a href='https://doc.rust-lang.org/std/marker/trait.Sync.html' target='_blank'>Sync</a></span>). Immutable access to the data is provided \
via an immutable borrow of the container. Mutable access to the data is provided via a mutable borrow of the container. Contained data is \
allocated on the heap.",

    "Arc":
"<span class='code smart-pointer'>Arc</span> \
(<span class='code'><a href='https://doc.rust-lang.org/std/sync/struct.Arc.html' target='_blank'>std::sync::<span class='smart-pointer'>\
Arc</span></a></span>) is a <span class='smart-pointer'>smart pointer</span> \
that provides <em>immutable shared</em> access to the inner data. This type is thread-safe if and only if the inner type is also \
thread-safe (implements <span class='code'><a href='https://doc.rust-lang.org/std/marker/trait.Send.html' target='_blank'>Send</a>\
</span> and <span class='code'><a href='https://doc.rust-lang.org/std/marker/trait.Sync.html' target='_blank'>Sync</a></span>). \
<span class='code smart-pointer'>Arc</span>s can be cloned freely, and will point to the same data, meaning you <em>own</em> a \
reference to the inner data. This is useful when you need to share data across threads, since you can only move owned or borrow \
<span class='code'>'static</span> data between threads. Contained data is allocated on the \
heap. The data will be dropped when the final <span class='code smart-pointer'>Arc</span> holding a reference to it is dropped.",

    "Rc":
"<span class='code smart-pointer'>Rc</span> \
(<span class='code'><a href='https://doc.rust-lang.org/std/rc/struct.Rc.html' target='_blank'>std::rc::<span class='smart-pointer'>\
Rc</span></a></span>) is a <span class='smart-pointer'>smart pointer</span> \
that provides <em>immutable shared</em> access to the inner data. This type is <em>not</em> thread-safe (<span class='code'>\
<a href='https://doc.rust-lang.org/std/marker/trait.Send.html' target='_blank'>!Send</a></span> and <span class='code'>\
<a href='https://doc.rust-lang.org/std/marker/trait.Sync.html' target='_blank'>!Sync</a></span>). <span class='code smart-pointer'>\
Rc</span>s can be cloned freely, and will point to the same data, meaning you <em>own</em> a reference to the inner data. This \
removes lifetime bounds, but adds runtime overhead instead. Contained data is allocated on the \
heap. The data will be dropped when the final <span class='code smart-pointer'>Rc</span> holding a reference to it is dropped.",

    "Cell":
"<span class='code interior-mut'>Cell</span> \
(<span class='code'><a href='https://doc.rust-lang.org/std/cell/struct.Cell.html' target='_blank'>std::cell::<span class='interior-mut'>\
Cell</span></a></span>) is a memory container that provides <span class='interior-mut'>interior mutability</span>. This type is <em>not</em> \
thread-safe (<span class='code'><a href='https://doc.rust-lang.org/std/marker/trait.Send.html' target='_blank'>!Send</a></span> and \
<span class='code'> <a href='https://doc.rust-lang.org/std/marker/trait.Sync.html' target='_blank'>!Sync</a></span>). Data can be moved or \
copied in and out of the container, but you cannot borrow the inner data. Since <span class='code interior-mut'>Cell</span>s are not thread-safe \
and do not allow borrowing of the data, they remain safe without the need for additional runtime checks.",

    "RefCell":
"<span class='code interior-mut'>RefCell</span> \
(<span class='code'><a href='https://doc.rust-lang.org/std/cell/struct.RefCell.html' target='_blank'>std::cell::<span class='interior-mut'>\
RefCell</span></a></span>) is a memory container that provides <span class='interior-mut'>interior mutability</span>. This type is <em>not</em> \
thread-safe (<span class='code'><a href='https://doc.rust-lang.org/std/marker/trait.Send.html' target='_blank'>!Send</a></span> and \
<span class='code'> <a href='https://doc.rust-lang.org/std/marker/trait.Sync.html' target='_blank'>!Sync</a></span>). Inner data can be \
borrowed immutably or mutably via only immutable access to the container. Runtime checks are added to enforce standard mutable borrow \
safety.",

    "Mutex":
"<span class='code interior-mut'>Mutex</span> \
(<span class='code'><a href='https://doc.rust-lang.org/std/sync/struct.Mutex.html' target='_blank'>std::sync::<span class='interior-mut'>\
Mutex</span></a></span>) is a memory container that provides <span class='interior-mut'>interior mutability</span>. This type is \
thread-safe if and only if the inner type is also thread-safe (implements <span class='code'>\
<a href='https://doc.rust-lang.org/std/marker/trait.Send.html' target='_blank'>Send</a></span>). Inner data can be borrowed immutably \
or mutably via only immutable access to the container. Runtime checks are added to enforce standard mutable borrow safety. Only one access \
is allowed at any given time. You may choose to wait for the lock to be released or immediately error. Consider also <span class='code'>\
<a href='https://docs.rs/parking_lot/latest/parking_lot/type.Mutex.html' target='_blank'>parking_lot::<span class='interior-mut'>\
Mutex</span></a></span> which has a slightly different implementation and API, and may also have better performance<sup>(citation needed)\
</sup>. Additionally consider <span class='code'>\
<a href='https://docs.rs/tokio/latest/tokio/sync/struct.Mutex.html' target='_blank'>tokio::sync::<span class='interior-mut'>\
Mutex</span></a></span> or <span class='code'>\
<a href='https://docs.rs/async-std/latest/async_std/sync/struct.Mutex.html' target='_blank'>async_std::sync::<span class='interior-mut'>\
Mutex</span></a></span> if you are writing asynchronous code, selecting the version which matches your chosen runtime.",

    "RwLock":
"<span class='code interior-mut'>RwLock</span> \
(<span class='code'><a href='https://doc.rust-lang.org/std/sync/struct.RwLock.html' target='_blank'>std::sync::<span class='interior-mut'>\
RwLock</span></a></span>) is a memory container that provides <span class='interior-mut'>interior mutability</span>. This type is \
thread-safe if and only if the inner type is also thread-safe (implements <span class='code'>\
<a href='https://doc.rust-lang.org/std/marker/trait.Send.html' target='_blank'>Send</a></span> and <span class='code'>\
<a href='https://doc.rust-lang.org/std/marker/trait.Sync.html' target='_blank'>Sync</a></span>). Inner data can be borrowed immutably \
or mutably via only immutable access to the container. Runtime checks are added to enforce standard mutable borrow safety. Many immutable \
accesses OR one mutable access is allowed at any given time. You may choose to wait for the lock to be released or immediately error. Consider also <span class='code'>\
<a href='https://docs.rs/parking_lot/latest/parking_lot/type.RwLock.html' target='_blank'>parking_lot::<span class='interior-mut'>\
RwLock</span></a></span> which has a slightly different implementation and API, and may also have better performance<sup>(citation needed)\
</sup>. Additionally consider <span class='code'>\
<a href='https://docs.rs/tokio/latest/tokio/sync/struct.RwLock.html' target='_blank'>tokio::sync::<span class='interior-mut'>\
RwLock</span></a></span> or <span class='code'>\
<a href='https://docs.rs/async-std/latest/async_std/sync/struct.RwLock.html' target='_blank'>async_std::sync::<span class='interior-mut'>\
RwLock</span></a></span> if you are writing asynchronous code, selecting the version which matches your chosen runtime.",

    "none":
"All types are allocated on the stack by default, and considered owned. Values can be marked as mutable via a <span class='code'>mut</span> \
binding or a <span class='code'>&mut</span> borrow."
};

function button_click(q, i) {
    const question = questions[q];
    const answers_element = document.getElementById("answers");

    for (const e of answers_element.children) {
        e.disabled = true;
    }

    const answer = question.choices[i];

    answer.select();

    const next_question = answer.next_question ? answer.next_question() : q + 1;

    clear_question_answers(() => generate_question(next_question));
}

function generate_question(q) {
    const question = questions[q];

    if (!question) {
        done()
        return;
    };

    const question_element = document.getElementById("question");
    question_element.innerHTML = question.question;

    const answers_element = document.getElementById("answers");
    answers_element.replaceChildren([]);

    // todo: add hints

    question.choices.forEach((answer, i) => {
        const button = document.createElement("button");

        button.innerHTML = answer.text;

        button.onclick = () => button_click(q, i);

        answers_element.append(button);
    });

    question_element.classList.remove("hidden-full");
    question_element.classList.remove("hidden");
    answers_element.classList.remove("hidden");
}

function clear_question_answers(callback) {
    const question_element = document.getElementById("question");
    const answers_element = document.getElementById("answers");

    question_element.classList.add("hidden");
    answers_element.classList.add("hidden");

    question_element.addEventListener("transitionend", (e) => {
        e.target.classList.add("hidden-full");

        callback();
    }, {
        capture: true,
        once: true
    });
}

function start_questions() {
    const start_button = document.getElementById("start");

    start_button.classList.add("hidden");
    start_button.addEventListener("transitionend", (b) => {
        b.target.classList.add("hidden-full");

        generate_question(0);
    }, {
        capture: true,
        once: true
    });
}

function done() {
    const question_element = document.getElementById("question");

    question_element.innerHTML = "All done!";

    let smart_pointer = null;
    if (selected_choices["shared"]) {
        smart_pointer = selected_choices["sync"] ? "Arc" : "Rc";
    } else if(selected_choices["heap"]) {
        smart_pointer = "Box";
    }

    let interior_mut = null;
    if (selected_choices["interior_mut"]) {
        if (selected_choices["sync"]) {
            interior_mut = selected_choices["mainly_read"] ? "RwLock" : "Mutex";
        } else if (selected_choices["sync"] === false) {
            interior_mut = selected_choices["borrow"] ? "RefCell" : "Cell";
        }
    }

    const final_type_element = document.getElementById("final-type");

    const post = "&gt;".repeat((smart_pointer !== null) + (interior_mut !== null));

    let pre = "";
    if (smart_pointer) pre += `<span class='smart-pointer'>${smart_pointer}</span>&lt;`
    if (interior_mut) pre += `<span class='interior-mut'>${interior_mut}</span>&lt;`

    final_type_element.innerHTML = pre + final_type_element.innerHTML + post;

    const final_comments_element = document.getElementById("final-comments");

    let comment = "";
    if (smart_pointer) comment += comments[smart_pointer] ?? "";
    if (interior_mut) comment += (smart_pointer ? "<br><br>" : "") + (comments[interior_mut] ?? "");

    if (!smart_pointer && !interior_mut) comment = comments["none"];

    final_comments_element.innerHTML = comment;

    document.getElementById("answers").classList.add("hidden-full");
    question_element.classList.remove("hidden-full");
    question_element.classList.remove("hidden");
    final_comments_element.classList.remove("hidden");
}

function type_input(e) {
    // todo: fix pasting newlines
    // todo: add some kind of character limit lol
    // `AbstractSingletonProxyFactoryBeanBuilderObserverServletEventHandlerAsyncGenerator` amazing type thanks Spey

    switch(e.inputType) {
        case "insertLineBreak":
        case "insertParagraph":
            e.preventDefault();
        break;

        // default:
        //     console.log(e);

        //     if (e.dataTransfer) {
        //         console.log(e.dataTransfer.getData("text/plain"));
        //     }
        // break;
    }
}

function copy() {
    navigator.clipboard.writeText(
        document.getElementById("final-type").textContent
    ).then(() => {
        document.getElementById("copy").innerText = "Copied!";
        setTimeout(() => document.getElementById("copy").innerText = "Copy!", 1500);
    });
}