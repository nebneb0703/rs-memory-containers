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
                hint: "This container can share the ownership of a single instance of your data in multiple locations. "
                    + "The lifetime of the data is managed internally.",
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

    // todo: fix this
    if (smart_pointer)
        document.getElementById(`${smart_pointer.toLowerCase()}-comment`)
            .classList.remove("hidden-full");
    if (interior_mut)
        document.getElementById(`${interior_mut.toLowerCase()}-comment`)
            .classList.remove("hidden-full");

    if (!smart_pointer && !interior_mut) document.getElementById("none-comment")?.classList.remove("hidden-full");

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
