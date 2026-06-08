---
title: "C++ coroutine"
description: "Tips, techniques for C++ coroutine."
authors: ["bLueriVerLHR"]
date: 2026-06-07T15:23:00+08:00
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
void taskA() {
  compute();   // do something
  wait();      // wait for new data
  compute();   // do something
  return;    // finish the task
}

void taskB() {
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

int main(int argc, char *argv[]) {
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

int main(int argc, char *argv[]) {
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

TO BE CONTINUED ...

[^cppreference]: https://cppreference.com

[^Reguera-Salgado_2024]: J. Reguera-Salgado, Asynchronous Programming with C++: Leveraging Modern C++ for Scalable and High-Performance Software Development, 1st ed. Birmingham: Packt Publishing Limited, 2024.

[^std_launch_deferred]: After the first request, the following requests to the same future will get the same results immediately via `std::shared_future`.
