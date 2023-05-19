# OSTEP

# Virtualization

## Process

**Process** informally is a running program. Most of the time on disk, spring into action if OS run them.

OS **virtualize** CPU with the basic technique know as **time-sharing** of CPU.

> the counterpart of time-sharing is space-sharing.
> 

> low-level machinery: mechanisms, low-level methods or protocols that implement a needed piece of functionality.
> 

Mechanism used: **context switch**.

> high-level intelligence: policies, algorithms for making some kind of decision within OS.
> 

Policies used: **scheduling policy**, using historical information, workload knowledge to make decisions, made by OS **scheduler**.

> machine state: What a program can read or update when running.
> 

Machine State Components:

- **address space**: The memory that the process can address. Part of process. Code & Data stored in memory.
- registers: gpr (general purpose registers), pc/ip (program counter/instruction pointer), sp (stack pointer), fp (frame pointer).
- I/O information: lists of file opened.

must-included process APIs:

- **Create**: create new process
- **Destroy**: destroy process forcefully
- **Wait**: wait for process to stop running
- **Miscellaneous**: misc ctrl on process other than destroy and wait
- **Status**: get status info about a process

### proc creation

first thing: **load** code and any static data into memory, into address space of the process.

Programs initially reside on disk (or flash-based SSDs) in some kind of executable format. OS read programs and load them.

> early/simple OS load eagerly: all at once. modern OS load lazily: load when needed during execution.
> 

mechanisms about lazy loading: **paging** & **swapping**

After loading:

1. alloc mem for prog’s **run-time stack** (or just **stack**).
2. init the stack with args. e.g. in C, argc, argv in main().
3. alloc mem for prog’s **heap**, for explicitly requested dynamically-allocated data. Growing during exec.
4. some other initialization. e.g. I/O related init, three default **file descriptors** opened, for stdin, stdout, stderr.

Then stage for exec:

1. jmp to entry point, namely main().
2. OS transfers ctrl of the CPU to newly-created proc
3. prog begins exec

### proc states

simplified three states:

- Running: exec-ing inst.
- Ready: ready to run but OS has chosen not to run it at this given moment.
- Blocked: perf some kind of operation that make it not ready to run until some event takes place.

ready -> running: proc scheduled

running -> ready: proc descheduled