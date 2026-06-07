---
title: "C++ coroutine"
description: "Tips, techniques for C++ coroutine."
authors: ["bLueriVerLHR"]
date: 2026-05-17T20:54:00+08:00
draft: false
tags: ["cpp", "coroutine", "asynchronous"]
toc: true
---

# Before We Start

When you hear "asynchronous programming", you might ask: what is it, and why should I care?

If you ask someone with experience, they'll probably toss around terms like *event loop*, *asyncio*, or *goroutines*.  
But in my view, asynchronous programming is just a nice way to organize the tasks you want your computer to do.

Let’s think back to how we used to program.  
First, set a value. Then call some functions or run a loop. Finally, return 0 to the C runtime (or whatever).  
It’s all sequential — we expect the code to do exactly what we wrote, top to bottom.  
Sometimes we throw in threads for parallelism, but even then, we still expect each thread to run from start to finish, just like we wrote.

But these days, that approach isn’t very efficient.

For example, if the operating system handled tasks one after another, you’d be stuck waiting hours for a download to finish — unable to do anything else.  
We want to listen to music, read a novel, or chat with our LLM assistant *while* that download is still running.  
That’s exactly what we call **concurrency**: handling multiple tasks seemingly at the same time, not one after another.

To handle tasks concurrently — the way Windows, Linux, or macOS do — we need a **scheduler** to manage them.  
Don’t let the name scare you. A scheduler is just something that tells the computer to run tasks in the order you want. For instance, running them sequentially.

Let’s look at a concrete example. Suppose we have two tasks, A and B, in pseudocode:

```cpp
auto taskA() -> void {
  compute();   // do something
  wait();      // wait for new data
  compute();   // do something
  return;    // finish the task
}

auto taskB() -> void {
  compute();   // do something
  wait();      // wait for new data
  compute();   // do something
  return;    // finish the task
}
```

Normally, we’d call `taskA()` then `taskB()` one after the other, or maybe run each in its own thread.  
But what if you want something different? Start `taskA`, and while it’s waiting, start `taskB`. Then while `taskB` is waiting, jump back to `taskA`.  
All of this can happen in a **single thread**, using time more efficiently — switching between tasks instead of sitting idle.

If that’s exactly what you’re thinking, then let me introduce you to **asynchronous programming**, because that’s what it was built for.  
Sure, there might be even better ways to handle tasks efficiently that we haven’t discovered yet. But for now, let’s focus on the async programming we actually want to do.

# Asynchronous Programming

When you have multiple tasks that don’t depend on each other too much, asynchronous programming is a solid choice.  
It works especially well for tasks that need to wait for some event to happen.

Take network I/O. You have to wait until all the data arrives. One approach is to set up a buffer and let the hardware write data into it. While that I/O is still happening, you can do something else — like computing or preparing another buffer for the next I/O.  
Once the I/O completes, the data is already in the buffer. You just get notified that the task is done, and you harvest the data from the buffer.

This is called the **proactor pattern** — because the I/O operation finishes *before* you’re notified.  
If instead you get notified when it’s *time* to do an I/O (without waiting for it to start), that’s the **reactor pattern**. In that case, you still have to handle the actual I/O operations yourself.

## std::promise — std::future

From the example above, you can see we’re essentially letting the hardware make a promise that it will write the received data into the buffer sometime soon. That’s the idea behind `promise` and `future`.  
In C++, these are introduced in [`<future>`](https://cppreference.com/cpp/header/future). Here’s a simple example:

```cpp
// Promise-Future Example
#include <future>
#include <array>
#include <thread>
#include <cstring>

#include <spdlog/spdlog.h>

auto main(void) -> int {
    using buffer_t = std::array<char, 1024>;
    std::promise<buffer_t> prom;

    spdlog::info("Now make a promise in the near future, we can get a value.");
    std::future<buffer_t> fut = prom.get_future();

    std::thread t([p = std::move(prom)] mutable {
        buffer_t buf;
        spdlog::info("Write buffer.");
        memset(buf.data(), 2, buf.size() * sizeof(char));
        spdlog::info("Set promise.");
        p.set_value(std::move(buf));
        spdlog::info("Exit.");
    });

    spdlog::info("Do something.");

    spdlog::info("Get from future.");
    buffer_t buf = fut.get();
    spdlog::info("Buffer got: [3]={}", static_cast<int>(buf[3]));

    t.join();
    return 0;
}
```

In this promise-future example, we create a promise and grab a future from it. We’ll retrieve the data from the future once the promise sets its value.

> A `future` is an object that represents some undetermined result that will be completed sometime in the future. A `promise` is the provider of that result. [^Reguera-Salgado_2024]

This looks like setting up a pipe between the main thread and another thread. However, the data type shared by a promise-future pair is fixed at compile time. You can’t just send anything you want — unless you serialize your object into bytes, which can be risky.

Sometimes you want the future result to be shared across multiple threads — like a broadcast. That’s where `std::shared_future` comes in.

> `std::shared_future` allows thread-safe access from different threads to the same shared state. [^Reguera-Salgado_2024]

You just call `fut.share()` to get a `std::shared_future` object, then copy it to wherever you need the result.

Maybe you don’t want to immediately assign a task to a thread. You just want to create tasks that can be executed later. C++ `<future>` provides `std::packaged_task` for that.  
You can wrap a function with `std::packaged_task`, then ship it off to a thread whenever you like.

In addition to wrapping a task, `std::packaged_task` can use its `make_ready_at_thread_exit` member to delay making the future ready until the thread is fully destroyed. Meanwhile, other threads keep waiting. When the thread that holds the task is destructed, the future becomes ready, and any waiting threads can continue.

## std::async

The promise-future example manually spins up a thread to simulate an asynchronous task. That might feel a bit too deliberate — having to create the promise from the main thread.  
So C++ `<future>` also gives us a convenience function: `std::async`, to kick off an async task more easily. Here’s an example:

```cpp
#include <future>
#include <array>
#include <thread>
#include <cstring>

#include <spdlog/spdlog.h>

auto main(void) -> int {
    using buffer_t = std::array<char, 1024>;

    spdlog::info("Now make a promise in the near future, we can get a value.");
    std::future<buffer_t> fut = std::async([] {
        buffer_t buf;
        spdlog::info("Write buffer.");
        memset(buf.data(), 2, buf.size() * sizeof(char));
        spdlog::info("Set promise.");
        spdlog::info("Exit.");
        return buf;
    });

    spdlog::info("Wait for promise.");
    buffer_t buf = fut.get();
    spdlog::info("Buffer got: {}", static_cast<int>(buf[3]));

    return 0;
}
```

Generally speaking, `std::async` gives you a cleaner way to set up a promise-future pair without manually creating a promise and handing it off to another thread.

> std::async is used to run a function asynchronously, allowing the main thread (or other threads) to continue running concurrently. [^Reguera-Salgado_2024]

We can also specify a launch policy for `std::async`. The choices are:

- `std::launch::async`: the task runs on a separate thread, potentially by creating and launching it first.
- `std::launch::deferred`: the task runs **on the calling thread** the first time its result is requested (lazy evaluation). [^std_launch_deferred]

You can use it like: `std::async(std::launch::async, func, args)`.

> If you want to limit the number of threads launched by `std::async`, use a semaphore.

## Conclusion

In this section, we briefly talked about C++’s support for async programming. But we didn’t touch on scheduling — the functions we wrote weren’t really designed to be scheduled.

I used to call `sched_yield()` from `<sched.h>` on Linux to bump a thread to the back of the scheduler’s queue. But that’s not portable at all. So I ended up learning async programming in Python first, then C++. I realized the design philosophies are worlds apart: C++ async is built for performance and gives you full control, while Python’s asyncio prioritizes ease of use. It didn’t take me long to grasp the basics of asyncio, even without knowing the internals. But with C++, you really need to understand what’s going on under the hood before you can use it effectively.

In the next chapter, we’ll dive into coroutines — functions you can manage with fine-grained control.

# Coroutine

Coroutines in C++ are more like syntactic sugar than a whole new concept. If I had to define a coroutine, I’d say:

> A coroutine is a function that can suspend itself. [^Reguera-Salgado_2024]

Yep, that’s it. A coroutine is a stackless **function** — not a thread or some lightweight process created by `clone3()`.  
So how can it suspend itself? The compiler spots the suspension points wherever you write `co_await`, `co_yield`, or `co_return`.

|Keyword|  I/O | Coroutine State |
|---|---|---|
|`co_await`| Input | Suspended |
|`co_yield`| Output | Suspended |
|`co_return`| Output | Terminated |

But we’re getting a little ahead of ourselves. Let’s first see what it takes to actually write a coroutine.  
The code below won’t compile — you’ll get an error like: class template "std::coroutine_traits" not found.

```cpp
// class template "std::coroutine_traits" not found
#include <optional>

#include <spdlog/spdlog.h>

auto coro_func(void) -> std::optional<int> {
    for (int i = 0; i < 10; ++i) {
        co_yield i;
    }
    co_return std::nullopt;
}

auto main(void) -> int {
    std::optional<int> ans = 0;
    while (ans = coro_func()) {
        spdlog::info("Get value: {}", ans);
    }
    return 0;
}
```

So what’s this `std::coroutine_traits` mentioned in the error? Since it’s a template, you can find its definition in `<coroutine>`. It lays out the requirements the return type of your coroutine must satisfy. In simple terms, the return type needs a nested type called `promise_type`. And that `promise_type` must itself meet a bunch of other requirements. You can check the full list at <https://cppreference.com/cpp/coroutine>.

Here’s a minimal “do‑nothing” coroutine that actually compiles:

```cpp
// do-nothing coroutine
#include <optional>
#include <coroutine>

#include <spdlog/spdlog.h>

struct return_type {
    struct promise_type {
        return_type get_return_object() { return return_type{*this}; }
        std::suspend_always initial_suspend() noexcept { spdlog::info("initial suspend"); return {}; }
        std::suspend_always final_suspend() noexcept { return {}; }
        std::suspend_always yield_value(int value) { return {}; }
        void return_value(std::nullopt_t opt) {}
        // void return_void() {}
        void unhandled_exception() {}
    };

    explicit return_type(promise_type&) { }
    ~return_type() noexcept { }
};

auto coro_func(void) -> return_type {
    for (int i = 0; i < 10; ++i) {
        co_yield i;
    }
    co_return std::nullopt;
}
```

Things start getting intricate here. A coroutine is so fine‑grained that we can control all its states through a set of member functions. Here’s a quick summary:

| member function        | return type trait         | arguments | purpose                                      |
|------------------------|---------------------------|-----------|----------------------------------------------|
| `get_return_object`    | promise_type wrapper type | void      | get the promise_type wrapper                 |
| `initial_suspend`      | awaitable                 | void      | set the initial suspension state             |
| `final_suspend`        | awaitable                 | void      | set the final suspension state               |
| `yield_value`          | awaitable                 | T         | yield a value and set the state after that   |
| `return_value`         | void                      | T         | return a value                               |
| `return_void`          | void                      | void      | return from a void‑style coroutine           |
| `unhandled_exception`  | void                      | void      | handle exceptions                            |

> Use `return_value` or `return_void` is decided by the `co_return` in a coroutine. In `unhandled_exception`, you need to use `std::current_exception()` to get the exception.

Let’s walk through the lifecycle of a coroutine function. Here’s what happens, step by step:

1. **Allocate the coroutine frame** – memory (similar to `new`) is set aside to hold all the arguments and local state of this stackless coroutine.
2. **Copy arguments** into the coroutine frame (the coroutine’s internal state).
3. **Construct the `promise_type` object** inside that frame.
4. **Call `get_return_object()`** to obtain an instance of `return_type`. This object is what the caller gets back.
5. **Call `initial_suspend()`** and obtain an awaitable.
   - The awaitable then goes through its own lifecycle (described below). If it says “suspend,” the caller gets the return object immediately while the coroutine body hasn’t started yet.
   - If the awaitable doesn’t suspend (e.g., `suspend_never`), the body starts right away and the caller only gets the return object after the coroutine first truly suspends or finishes.
6. **Coroutine body execution begins** (after the initial suspension resolves, if any).  
   - During execution, local variables live in the coroutine frame. The coroutine can be suspended and resumed many times.
7. **Inside the body – suspension points**
   - `co_await expr`: transforms `expr` into an awaitable and follows the awaitable lifecycle. The coroutine may suspend here.
   - `co_yield expr`: equivalent to `co_await promise.yield_value(expr)` — same awaitable lifecycle.
8. **Reaching the end or `co_return`**
   - If `co_return expr;` is used, `promise.return_value(expr)` is called.  
   - If `co_return;` (or falling off the end in a void‑style coroutine), `promise.return_void()` is called.  
   - Local variables are destroyed in reverse order of construction.  
   - `promise.final_suspend()` is called, and the resulting awaitable goes through the awaitable lifecycle.  
     - Typically `final_suspend` returns `std::suspend_always` — the coroutine suspends one last time. This keeps the frame alive so the caller can inspect the promise (e.g., read a result) and must call `handle.destroy()` later.  
     - If it returns something that doesn’t suspend (like `suspend_never`), the coroutine automatically destroys itself right after `final_suspend` resolves — the frame is freed, the promise is destroyed, and no further resumption is allowed.
9. **Coroutine frame destruction**  
   When `handle.destroy()` is called (or the frame self‑destructs), the following happens in order:  
   a. The promise object’s destructor runs.  
   b. Destructors for the parameter copies stored in the frame run.  
   c. The coroutine frame memory is freed (via the appropriate `operator delete`).

Now let’s zoom into the **awaitable lifecycle** that governs every `co_await` or `co_yield`:

1. **Obtain the awaitable**  
   - For `co_await expr`, the expression may first be passed through `promise.await_transform(expr)` if that member exists; otherwise `expr` is used directly.  
   - For `initial_suspend` / `final_suspend`, the returned object is already the awaitable.
2. **Get the awaiter**  
   The awaitable is converted to an awaiter by checking (in order):  
   - A member function `operator co_await()`  
   - A free function `operator co_await()` found via ADL  
   - If neither exists, the awaitable itself is used as the awaiter (it must provide `await_ready`, `await_suspend`, `await_resume`).
3. **Check readiness**  
   - `awaiter.await_ready()` is called.  
     - If it returns `true` → result is available immediately; no suspension. Skip to step 5 (`await_resume`).  
     - If it returns `false` → the coroutine must suspend. Proceed to step 4.
4. **Suspend the coroutine**  
   - The coroutine state is saved (current execution point).  
   - `awaiter.await_suspend(handle)` is called, where `handle` is the `coroutine_handle` of the current coroutine. The return type of `await_suspend` dictates what happens next:
     - `void` → coroutine stays suspended, control returns to the caller/resumer. The awaiter is responsible for resuming the coroutine later (e.g., by storing the handle and calling `handle.resume()` from an I/O callback).
     - `bool` → if `true`, remains suspended; if `false`, the coroutine is resumed immediately (short‑circuit, no real suspension).
     - Another `coroutine_handle` → **symmetric transfer**: the current coroutine stays suspended, and the other handle is immediately resumed. This avoids stack buildup and transfers control directly.
5. **Resumption / getting the result**  
   - When the coroutine is eventually resumed (via `handle.resume()` or symmetric transfer), `awaiter.await_resume()` is called. Its return value becomes the result of the `co_await` expression.  
   - If `await_ready` was `true`, `await_resume` is called immediately without any suspension, and its result is used directly.

That’s quite a flow. Personally, I’d just keep a reference handy every time I need it.  
At this point, you can see that a coroutine is really just a function with a complex lifecycle. But it’s not inherently asynchronous — you are the one responsible for managing that lifecycle. You’d need to build a thread pool, dispatch coroutines to threads, react to suspended ones, wake up ready ones, and so on.

So if we want to schedule coroutines, it quickly becomes a sizable project. We’d have to write our own event loop, like the [example here](https://dev.to/atimin/the-simplest-example-of-coroutines-in-c20-4l7a).

In practice, if you want to write a coroutine that behaves like a goroutine using only the standard C++ library, you’ll have to wait for a future standard to cover that ground. If you just want to get things done today, **Boost.Asio** and **Boost.Cobalt** are solid choices — and using them is mainly about learning a new library. The knowledge we’ve gone through here simply shows how those libraries are built on top of standard C++.

[^cppreference]: https://cppreference.com

[^Reguera-Salgado_2024]: J. Reguera-Salgado, Asynchronous Programming with C++: Leveraging Modern C++ for Scalable and High-Performance Software Development, 1st ed. Birmingham: Packt Publishing Limited, 2024.

[^std_launch_deferred]: After the first request, the following requests to the same future will get the same results immediately via `std::shared_future`.
