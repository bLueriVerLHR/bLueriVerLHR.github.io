# Var，Let和Const有何不同？

**并非只有翻译**

原文链接：<https://www.freecodecamp.org/news/var-let-and-const-whats-the-difference/>

---

在过去的ES2015（ES6）中，涌现出了许多值得留意的特性。同时2020年的如今，可以想象已经有许多的JavaScript开发者已经变得熟悉并开始使用这些特性。

现实是不一定真的有很多JS开发者真如想象中那般开始熟悉并运用这些特性，依然有许多的特性对于开发者来说还是难以理解的。

就比方说，本文将要讨论的，在ES6中加入的两个新的用于声明变量的关键字 `let` 和 `const`。问题在于，这两个关键字和过去我们经常使用的 `var` 到底有什么区别？有什么理由或者场景会让我们使用新的关键字而不是 `var`？

本文我们就来讨论 `var`，`let` 和 `const` 在作用域，用法和变量提升（Hoisting）方面的不同。在阅读的过程中，请关注文中指出的不同之处。

## var

在ES6到来之前，`var` 这种声明方法是JS中最常见的声明方式（有时候可以不用 `var` 声明直接使用变量，但这明显是不推荐的）。不过，由 `var` 声明的变量依然是有许多的问题。这就是为什么提出新的变量声明方式是非常有必要的。

首先，在讨论开始前，我们先来了解一下 `var` 的特性。

### var的作用域

作用域即声明的变量的可用范围，在这个范围内该变量是可以被做赋值等操作的。`var` 声明的变量具有全局作用域（globally scoped）或者函数/本地作用域（functional/locally scoped）。

当 `var` 声明的变量在所有函数外面的时候，他的作用域是全局的。这意味着一个在所有函数外用 `var` 声明的变量在整个窗口内都是可以使用的。（有些情况下，它会被局部变量覆盖，即优先使用局部变量而不是全局变量）

当 `var` 声明的变量在任意一个函数内的时候，他的作用域就被限制在了函数内部。这意味这你只能在函数内部获取到该函数。（不过你依然可以用闭包等技术在函数外对它操作）

为了加深理解，我们来看看下面的例子：

``` javascript
var greeter = "hey hi";

function newFunction() {
    var hello = "hello";
}
```

在这个例子中，`greeter` 是一个全局变量，因为他在所有的函数外面，但是 `hello` 则只有函数作用域。所以我们无法在函数外面获取到 `hello` 的值。

所以如果我们这么做：

``` javascript
var greeter = "hey hi";

function newFunction() {
    var hello = "hello";
}

console.log(hello); // ReferenceError: hello is not defined
```

我们会得到一个 `ReferenceError`，因为 `hello` 并不能在函数外使用。

### var声明的变量可以被重复声明和更新值

这个特性意味着我们可以这么做：

``` javascript
var greeter = "hey hi";
var greeter = "say Hello instead";
```

同时也可以这么做：

``` javascript
var greeter = "hey hi";
greeter = "say Hello instead";
```

### var的变量提升

变量提升是JavaScript的一个特殊机制，这个机制使得变量和函数的声明在代码执行前会从变量被声明的地方移动到当前域的最上方。

这意味这如果我们这么做：

``` javascript
console.log(greeter);
var greeter = "say hello";
```

会被像如下这样解释运行：

``` javascript
var greeter = undefined;
console.log(greeter); // greeter is undefined
greeter = "say hello";
```

因此，`var` 的变量提升是放到变量所处域的最上方，并且用 `undefined` 初始化。

### var的一些问题

`var` 是有一些不足之处的，比如如下例子：

``` javascript
var greeter = "hey hi";
var times = 4;

if (times > 3) {
    var greeter = "say Hello instead";
}

console.log(greeter) // "say Hello instead"
```

在上例子中，因为 `times>3` 为 `true`，所以 `greeter` 被重定义为 `"say  Hello instead"`。如果你希望 `greeter` 被这么重定义，那么这并不是什么大问题。但是当你不希望这种事情发生的时候，那么在意识到 `greeter` 已经被定义之前，这就是个巨大的隐患。

当你在其他代码处使用这个 `greeter` 的时候，就可能会惊奇的发现输出并非期望。这就可能会导致很多bug的出现。

可以理解的是，`var` 遵循的是全局作用域和函数/本地作用域域，而不是按照块作用域。在其他语言比如C语言中，一个变量在内层代码块中再次声明会生成一个临时变量，当退出代码块的时候会恢复外层的变量。但是我们可以从上例明显地看出 `var` 没有这种特性，他只关心声明的变量是在函数内还是函数外。

## let

目前，`let` 是声明变量的最佳首选。毫不意外地，它是作为 `var` 的升级版被加入的。它同样解决了 `var` 引发的问题。接下来让我们看一下它是怎么做到的。

### let是块作用域的

一个代码块是一块用 `{}` 包裹住的代码。一个代码块在一个成对花括号的代码块中间。任何在一对花括号之间的内容都可以算作代码块。

所以在代码块内用 `let` 声明的变量只有块作用域，也即只能在该代码块中使用。

我们来看一下下面的例子：

``` javascript
let greeting = "say Hi";
let times = 4;

if (times > 3) {
    let hello = "say Hello instead";
    console.log(hello);// "say Hello instead"
}
console.log(hello) // hello is not defined

// 下面两个更加凸显这个特性

{
    let a = 10;
}
console.log(a); // a is not defined

let b = 100;
{
    let b = 20;
    console.log(b); // 20
}
console.log(b); // 100
```

我们可以看到，在 `hello` 所处的代码块外使用它会返回一个错误。这就是 `let` 的块作用域特性。

### let可以被更新值但是不能被重复定义

就像 `var` 一样，一个被 `let` 声明的变量可以在它所处的作用域内被赋值。但是与 `var` 不同的是，一个 `let` 声明的变量不能再在它所处的作用域内被定义。

如下代码可以执行：

``` javascript
let greeting = "say Hi";
greeting = "say Hello instead";
```

但是如下的不能执行：

``` javascript
let greeting = "say Hi";
let greeting = "say Hello instead"; // error: Identifier 'greeting' has already been declared
```

不过，我们可以在不同的代码块中声明相同名字的变量（也如其他语言比如C一样，优先使用处于同一作用域的，作用域最小的变量），例如：

``` javascript
let greeting = "say Hi";
if (true) {
    let greeting = "say Hello instead";
    console.log(greeting); // "say Hello instead"
}
console.log(greeting); // "say Hi"
```

为何不会报错呢？这是因为声明在不同块作用域中的同名变量是作为不同的实例对待的。

也是因为这一点，使得 `let` 成为比 `var` 更好的选择。当我们使用 `let` 的时候，我们不用再考虑吧这个变量之前是否定义过，`let` 声明的变量只会存在于它自己的作用域中，且不会被二次定义。

### let的变量提升

和 `var` 一样，`let` 声明会被提高到作用域顶部。但是和 `var` 不一样的是，`var` 默认初始化为 `undefined`，而 `let` 不做初始化。所以如果你在声明前使用 `let` 声明的变量，你会得到一个 `ReferenceError`。

## const

被声明为 `const` 的变量，会保持常值。也即不能被修改。`const` 声明和 `let` 声明有很多相似的特性。

### const声明是块作用域的

和 `let` 一样，`const` 声明的变量只能在块作用域内被使用。

### const既不能被更新值，也不能被重复定义

这意味声明 `const` 变量之后，该变量在作用域内的值是不会改变的。它既不能被赋值也不能被重复声明。所以接下来的操作都不行：

``` javascript
const greeting = "say Hi";
greeting = "say Hello instead";// error: Assignment to constant variable.
```

``` javascript
const greeting = "say Hi";
const greeting = "say Hello instead";// error: Identifier 'greeting' has already been declared
```

因此，每一个 `const` 声明都应该在声明的时候初始化。

不过，当对于用 `const` 声明的对象的时候，行为会有些不同。虽然一个 `const` 变量不能被赋值，但是它的属性是可以修改的。例如如下声明：

``` javascript
const greeting = {
    message: "say Hi",
    times: 4
}
```

如下操作是不行的：

``` javascript
greeting = {
    words: "Hello",
    number: "five"
} // error:  Assignment to constant variable.
```

但是如下操作是可以的：

``` javascript
greeting.message = "say Hello instead";
```

这样我们可以更新 `greeting.message` 但不返回错误。

### const的变量提升

和 `let` 一样，`const` 声明会被提升到块作用域最上方，但是不会被初始化。

## 总结

- `var` 声明是全局作用域或者函数作用域的，但是 `let` 和 `const` 是块作用域的。
- `var` 变量可以被赋值，被重定义；`let` 变量可以被赋值，不可以被重定义；`const` 变量不可以被赋值，不可以被重定义。
- 他们都会被提升到作用域最上方，但是只有 `var` 会被初始化为 `undefined`。而 `let` 和 `const` 不会初始化。
- `var` 和 `let` 不需要在声明的时候被赋值，但是 `const` 变量需要在声明的时候被赋值。

## 结语

感谢阅读:)

（谢谢，感受到了JavaScript黑魔法的美丽了。（bushi））