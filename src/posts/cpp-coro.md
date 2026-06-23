---
title: "C++ coroutine"
description: "Tips, techniques for C++ coroutine."
authors: ["bLueriVerLHR"]
date: 2026-06-07T15:23:00+08:00
draft: false
tags: ["cpp", "coroutine", "asynchronous"]
toc: true
---

## Before We Start

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

## Asynchronous Programming

When you have multiple tasks that don’t depend on each other too much, asynchronous programming is a solid choice.  
It works especially well for tasks that need to wait for some event to happen.

Take network I/O. You have to wait until all the data arrives. One approach is to set up a buffer and let the hardware write data into it. While that I/O is still happening, you can do something else — like computing or preparing another buffer for the next I/O.  
Once the I/O completes, the data is already in the buffer. You just get notified that the task is done, and you harvest the data from the buffer.

This is called the **proactor pattern** — because the I/O operation finishes *before* you’re notified.  
If instead you get notified when it’s *time* to do an I/O (without waiting for it to start), that’s the **reactor pattern**. In that case, you still have to handle the actual I/O operations yourself.

### std::promise — std::future

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

### std::async

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

### Why Coroutines?

So far we've looked at threads, promise-future, and `std::async`. All three share the same DNA: each task runs inside a function that must run to completion. Once `taskA()` starts, it owns the thread until it returns. If `taskA()` happens to wait on I/O, the thread sits idle — and threads are expensive. A typical OS thread consumes megabytes of stack space and involves a kernel context switch every time the scheduler swaps it out.

Promise-future and `std::async` dress this up nicely — they let you *express* asynchronous work — but they still lean on threads under the hood. You're paying the thread tax; you've just hidden the receipt.

What we really want is a way to write a single function that can **pause in the middle**, hand the CPU back, and resume later — all within the same thread. No kernel involvement, no megabytes of stack per task, no preemption surprises. Just cooperative multitasking where the programmer decides when to yield.

That's exactly what coroutines give us. The compiler takes an ordinary-looking function and rewrites it into a **state machine**. At every `co_await` or `co_yield` point, the compiler inserts a "bookmark" so the function can tear down its transient state, return control to the caller, and later be *resumed* from exactly where it left off. The cost? A single heap allocation for the coroutine frame (which the compiler may even elide in simple cases).

> **Threads** preempt you. **Promises** decouple producer and consumer. **Coroutines** let you pause and resume a function without losing its brain.

I used to call `sched_yield()` from `<sched.h>` on Linux to bump a thread to the back of the scheduler's queue. But that's not portable at all. So I ended up learning async programming in Python first, then C++. I realized the design philosophies are worlds apart: C++ async is built for performance and gives you full control, while Python's asyncio prioritizes ease of use. It didn't take me long to grasp the basics of asyncio, even without knowing the internals. But with C++, you really need to understand what's going on under the hood before you can use it effectively.

With that in mind, let's open the hood.

## Coroutines in C++

Coroutines in C++ are more syntactic sugar than a whole new concept. If I had to define a coroutine, I’d say:

> A coroutine is a function that can suspend itself.[^Reguera-Salgado_2024]

That’s the essence. A coroutine in C++ is a *stackless* **function** — not a thread, not a lightweight process created by `clone3()`. It’s just a function with superpowers.

So, what does it mean for a function to suspend itself, and why would we want that? The answer: only the coroutine itself knows *when* to pause. The outside world has no idea when a long I/O operation or some other wait will force the coroutine to yield. Think of a process running on an operating system: we only discover that a process is suspended when it makes a certain system call. The OS then puts the process to sleep and schedules a ready one. Coroutines follow the same pattern — they voluntarily suspend to wait for something, and the machinery of the language lets another coroutine use the computation resources that were just freed.

When a coroutine waits for an I/O operation, the resources it held (like stack space and execution state) can be released and handed to another coroutine. Of course, its context must be saved so it can resume later; that's done transparently by the compiler. Once the I/O is complete, the coroutine can be assigned fresh resources (if needed), and its context is restored. From the programmer's perspective, the function just continues from where it left off.

### Coroutine Lifecycle: Step by Step

If you're new to coroutines, the easiest way to build a mental model is to walk through what happens from the moment a coroutine is called to the moment it's destroyed. Think of it as the "life of a coroutine" in five acts.

**Act 1 — Detection & frame allocation.** When the compiler sees a function body containing `co_await`, `co_yield`, or `co_return`, it knows: this is a coroutine. It silently rewrites it into a state machine. The first thing that happens at runtime is a heap allocation — the *coroutine frame*. This frame holds the function's local variables, the promise object, and a resume index (a number that remembers which suspension point to jump back to). If the compiler can prove the frame never outlives the caller, it may elide the heap allocation entirely (HALO — Heap Allocation Elision Optimization).

**Act 2 — Return object & initial suspend.** The runtime calls `get_return_object()` on the promise to produce whatever the caller sees as the coroutine's return value (a lightweight handle, not the final result). Immediately after, `initial_suspend()` is called. If it returns a "not ready" awaitable (like `std::suspend_always`), the coroutine *halts before running a single line of user code*. This is called "lazy start" — the caller must explicitly resume the handle to kick off the body. If it returns `std::suspend_never`, the body begins running right away.

**Act 3 — Execution & suspension.** The coroutine body runs until it hits its first suspension point — a `co_await`, `co_yield`, or the final `co_return`. At a suspension point, three things happen in sequence:
1. `await_ready()` — "Is the result already available?" If yes, skip suspension entirely and go straight to `await_resume()`.
2. `await_suspend(handle)` — The coroutine is about to go to sleep. This is your chance to stash the coroutine handle somewhere (an event queue, a timer, another thread) so it can be resumed later.
3. `await_resume()` — Called when the coroutine is woken up. Its return value becomes the result of the `co_await` expression.

**Act 4 — Resume.** When the outside world calls `handle.resume()`, the coroutine picks up right after the suspension point. It reads the resume index from the frame, jumps to the matching code block, calls `await_resume()` to get the awaited value, and continues executing the body as if nothing happened.

**Act 5 — Final suspend & destruction.** When the body reaches `co_return` (or falls off the end), `return_value()` or `return_void()` is called on the promise to stash the final result. Then `final_suspend()` is called. This is important: the final suspend point gives the caller one last chance to inspect the result (`handle.promise().get()`) *before* the frame is destroyed. If `final_suspend()` returns `std::suspend_never`, the coroutine destroys itself immediately — meaning the handle is dangling the moment the body finishes. In practice, most coroutine types use `std::suspend_always` at `final_suspend()` so the caller retains ownership of the destruction via `handle.destroy()`.

Here's a condensed timeline:

```
Caller calls coroutine
  → compiler-inserted: new coroutine frame (heap, unless HALO)
  → promise::get_return_object()          // caller receives handle
  → promise::initial_suspend()            // lazy start? or run now?
      ↘ suspend_always: caller must resume()
      ↘ suspend_never:  body runs immediately
Body runs...
  → co_await expr
      → expr.await_ready()?               // already done?
          yes → expr.await_resume() → continue
          no  → expr.await_suspend(handle)  // stash handle, return to caller
  ...later, handle.resume()...
      → expr.await_resume() → continue
Body finishes...
  → promise::return_value(val) or return_void()
  → promise::final_suspend()
      ↘ suspend_always: caller reads result → caller destroys frame
      ↘ suspend_never:  frame destroys itself immediately
```

With this lifecycle in mind, every coroutine type you'll encounter — generators, tasks, async lambdas — follows exactly the same pattern. The differences lie only in *when* you resume the handle and *who* owns destruction.

C++ gives you a DIY toolkit to build this machinery, centered around the `coroutine_traits` customization point and several required types and methods. (The [GCC source](https://github.com/gcc-mirror/gcc/blob/1f774d902f1ec9ae6a487e00ba49514d3b37057f/gcc/cp/coroutines.cc#L444-L478) has a long list of identifiers it uses internally to recognise and validate coroutines.)

```cpp
static void
coro_init_identifiers ()
{
  coro_traits_identifier = get_identifier ("coroutine_traits");
  coro_handle_identifier = get_identifier ("coroutine_handle");
  coro_promise_type_identifier = get_identifier ("promise_type");

  coro_await_transform_identifier = get_identifier ("await_transform");
  coro_initial_suspend_identifier = get_identifier ("initial_suspend");
  coro_final_suspend_identifier = get_identifier ("final_suspend");
  coro_return_void_identifier = get_identifier ("return_void");
  coro_return_value_identifier = get_identifier ("return_value");
  coro_yield_value_identifier = get_identifier ("yield_value");
  coro_address_identifier = get_identifier ("address");
  coro_from_address_identifier = get_identifier ("from_address");
  coro_get_return_object_identifier = get_identifier ("get_return_object");
  coro_gro_on_allocation_fail_identifier =
    get_identifier ("get_return_object_on_allocation_failure");
  coro_unhandled_exception_identifier = get_identifier ("unhandled_exception");

  coro_await_ready_identifier = get_identifier ("await_ready");
  coro_await_suspend_identifier = get_identifier ("await_suspend");
  coro_await_resume_identifier = get_identifier ("await_resume");

  /* Coroutine state frame field accessors.  */
  coro_resume_fn_id = get_identifier ("_Coro_resume_fn");
  coro_destroy_fn_id = get_identifier ("_Coro_destroy_fn");
  coro_promise_id = get_identifier ("_Coro_promise");
  coro_frame_needs_free_id = get_identifier ("_Coro_frame_needs_free");
  coro_frame_i_a_r_c_id = get_identifier ("_Coro_initial_await_resume_called");
  coro_resume_index_id = get_identifier ("_Coro_resume_index");
  coro_self_handle_id = get_identifier ("_Coro_self_handle");
  coro_actor_continue_id = get_identifier ("_Coro_actor_continue");
  coro_frame_refcount_id = get_identifier ("_Coro_frame_refcount");
}
```

Defining a coroutine from scratch is involved. First you need to decide how (or even whether) to schedule the coroutines. Then you must implement the core types: a `promise_type`, a wrapper for it (often called the return type), and any custom awaitables (or you can fall back to the handy `std::suspend_always` and `std::suspend_never`).

Here’s a minimal example that defines a generator coroutine `demo(void)`:

```cpp
#include <optional>
#include <coroutine>

#include <spdlog/spdlog.h>

struct ReturnType;

struct PromiseType {
    using value_t = std::optional<int>;

    void unhandled_exception() {
        auto e = std::current_exception();
        try {
            std::rethrow_exception(e);
        } catch (std::exception &e) {
            spdlog::error("{}", e.what());
        }
    }

    ReturnType get_return_object();

    std::suspend_never initial_suspend() noexcept {
        return {};
    }

    std::suspend_always yield_value(value_t value) {
        value_ = value;
        return {};
    }

    void return_value(value_t value) { value_ = value; }

    // void return_void() {}

    std::suspend_always final_suspend() noexcept { return {}; }

    const value_t &get() { return value_; }

private:
    value_t value_;
};

struct ReturnType {
    using promise_type = PromiseType;
    using handle_t = std::coroutine_handle<promise_type>;

    explicit ReturnType(handle_t handle) : handle_{handle} { }

    ~ReturnType() noexcept { }

    std::optional<int> yield() {
        if (not handle_.done()) {
            handle_.resume();
        }
        return handle_.promise().get();
    }

private:
    std::coroutine_handle<promise_type> handle_;
};

ReturnType PromiseType::get_return_object() {
    return ReturnType { std::coroutine_handle<PromiseType>::from_promise(*this) };
}

ReturnType demo(void) {
    for (int i = 0; i < 10; ++i) {
        co_yield i;
    }
    co_return std::nullopt;
}

int main(int argc, char *argv[]) {
    std::optional<int> ans = 0;
    ReturnType ret = demo();
    while (auto value = ret.yield()) {
        spdlog::info("value: {}", value.value());
    }
    return 0;
}
```

The code above defines a simple generator. It produces values via `co_yield` and finishes with `co_return`. The `ReturnType` struct is the coroutine’s return type, sometimes called the “promise wrapper”. It must expose a `promise_type` member (either via a nested type or a `using` declaration).

The `promise_type` dictates how the coroutine reacts to key events: `co_yield`, `co_await`, and `co_return`.

- **`co_yield`**: Calls `yield_value(value)` on the promise. It returns an awaitable (here `std::suspend_always`), which tells the coroutine to suspend and hand the value back to the caller. The coroutine does *not* end.
- **`co_return`**: Calls `return_value(value)` or `return_void()` depending on whether a value is returned. This marks the coroutine as finished.
- **`co_await`**: Indicates that the coroutine is waiting for some asynchronous event. It can suspend the coroutine without blocking the underlying thread, allowing the thread to schedule another coroutine. The awaitable controls this behavior.

The `demo()` function itself is a simple coroutine with no scheduler. It uses the standard awaitables `std::suspend_always` and `std::suspend_never`, defined in `<coroutine>`:

```cpp
// 17.12.5 Trivial awaitables
/// [coroutine.trivial.awaitables]
struct suspend_always
{
  constexpr bool await_ready() const noexcept { return false; }

  constexpr void await_suspend(coroutine_handle<>) const noexcept {}

  constexpr void await_resume() const noexcept {}
};

struct suspend_never
{
  constexpr bool await_ready() const noexcept { return true; }

  constexpr void await_suspend(coroutine_handle<>) const noexcept {}

  constexpr void await_resume() const noexcept {}
};
```

If you want to create your own awaitable type, you must implement three methods:
- `bool await_ready()` – Check if the operation is already complete at the `co_await` point.
- `void await_suspend(coroutine_handle<>)` – Called when the coroutine actually suspends. This is where you can take control of the coroutine handle and later resume it from the outside.
- `T await_resume()` – Called when the coroutine is resumed; the result becomes the value of the `co_await` expression.

When a coroutine is invoked, you receive a handle that tracks its state.
- If the coroutine’s initial suspend point (`initial_suspend()`) is *not* ready, it will suspend immediately without executing any user code. Only when the handle is resumed does the body start (or continue).
- If the initial suspend is ready (`std::suspend_never`), the coroutine runs until it hits the first real suspension point.
- The same logic applies to `co_yield` and the final suspend at the end of the function.

With these building blocks you can construct generators, async tasks, and all manner of stackless cooperative concurrency — all without leaving the familiar syntax of a function.

[^Reguera-Salgado_2024]: (your original footnote – keep as is)

[^cppreference]: https://cppreference.com

[^Reguera-Salgado_2024]: J. Reguera-Salgado, Asynchronous Programming with C++: Leveraging Modern C++ for Scalable and High-Performance Software Development, 1st ed. Birmingham: Packt Publishing Limited, 2024.

[^std_launch_deferred]: After the first request, the following requests to the same future will get the same results immediately via `std::shared_future`.
