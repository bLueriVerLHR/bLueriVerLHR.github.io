# Compiler for Brainfuck

`date: 2021-08-01`

---

The code is copied from an article in Zhihu. The original answer is [here](https://www.zhihu.com/question/434732218/answer/1635894731).

But today I will give a simple introduction to brainfuck as well.

<!--more-->

---

## Simple Introduction to Brainfuck

As one of the most famous esoteric programming languages, brainfuck only has 8 commands.

Brainfuck operates on an array consisting of zero.

``` plaintext
... [0] [0] [0] [0] [0] [0] ...
```

The length of this array has no strict limits. Additionally, there is a pointer, initially pointing to the first memory cell.

The 8 commands are:

|Command|Description                                                      |
|-------|-----------------------------------------------------------------|
|>      |Move the pointer to the right                                    |
|<      |Move the pointer to the left                                     |
|+      |Increment the memory cell at the pointer                         |
|-      |Decrement the memory cell at the pointer                         |
|.      |Output the character signified by the cell at the pointer        |
|,      |Input a character and store it in the cell at the pointer        |
|[      |Jump past the matching ] if the cell at the pointer is 0         |
|]      |Jump back to the matching [ if the cell at the pointer is nonzero|

All characters except `><+-.,[]` should be used.

## Complier's Source Code

Here is the source code of the compiler.

The C++ version must compiled as a cpp file, since I failed with the argv\[1\].

``` c++
#include <stdio.h>
#include <stdlib.h>

char s[30000] = {0};
char code[100000];
int len = 0;
int stack[100];
int stack_len = 0;

int main(int argc,char **argv) {
    char ch;
    
    FILE* file;
    char* p = s + 10000;
   
    file = fopen(argv[1],"r");
        
    while(fread(&code[len], 1, 1, file) == 1) {
        len++;
    }
    setbuf(stdout,NULL);
    for (int i = 0; i < len; i++) {
        switch(code[i]) {
            case '+':
                (*p)++;
                break;
            case '-':
                (*p)--;
                break;
            case '>':
                p++;
                break;
            case '<':
                p--;
                break;
            case '.':
                putchar((int)(*p));
                break;
            case ',':
                *p=getchar();
                break;
            case '[':
                if(*p) {
                    stack[stack_len++]=i;
                } else {
                    int j,k;
                    for(k = i, j = 0; k < len; k++) {
                        code[k] == '[' && j++;
                        code[k] == ']' && j--;
                        if(j == 0) break;
                    }
                    if(j == 0)
                        i = k;
                    else {
                        fprintf(stderr,"%s:%dn",__FILE__,__LINE__);
                        return 3;
                    }
                }
                break;
            case ']':
                i = stack[stack_len-- - 1] - 1;
                break;
            default:
                break;
        }
    }
    return 0;
}
```

Go version now has a bad performace when encouter with Chinese character.

``` go
package main

import (
    "bufio"
    "errors"
    "fmt"
    "io/ioutil"
    "os"
)

type Instruction struct {
    operator uint16
    operand  uint16
}

const (
    op_inc_dp = iota
    op_dec_dp
    op_inc_val
    op_dec_val
    op_out
    op_in
    op_jmp_fwd
    op_jmp_bck
)

const data_size int = 65535

func compileBF(input string) (program []Instruction, err error) {
    var pc, jmp_pc uint16 = 0, 0
    jmp_stack := make([]uint16, 0)
    for _, c := range input {
        switch c {
        case '>':
            program = append(program, Instruction{op_inc_dp, 0})
        case '<':
            program = append(program, Instruction{op_dec_dp, 0})
        case '+':
            program = append(program, Instruction{op_inc_val, 0})
        case '-':
            program = append(program, Instruction{op_dec_val, 0})
        case '.':
            program = append(program, Instruction{op_out, 0})
        case ',':
            program = append(program, Instruction{op_in, 0})
        case '[':
            program = append(program, Instruction{op_jmp_fwd, 0})
            jmp_stack = append(jmp_stack, pc)
        case ']':
            if len(jmp_stack) == 0 {
                return nil, errors.New("compilation error")
            }
            jmp_pc = jmp_stack[len(jmp_stack)-1]
            jmp_stack = jmp_stack[:len(jmp_stack)-1]
            program = append(program, Instruction{op_jmp_bck, jmp_pc})
            program[jmp_pc].operand = pc
        default:
            pc--
        }
        pc++
    }
    if len(jmp_stack) != 0 {
        return nil, errors.New("compilation error")
    }
    return
}

func executeBF(program []Instruction) {
    data := make([]int16, data_size)
    var data_ptr uint16 = 0
    reader := bufio.NewReader(os.Stdin)
    for pc := 0; pc < len(program); pc++ {
        switch program[pc].operator {
        case op_inc_dp:
            data_ptr++
        case op_dec_dp:
            data_ptr--
        case op_inc_val:
            data[data_ptr]++
        case op_dec_val:
            data[data_ptr]--
        case op_out:
            fmt.Printf("%c", data[data_ptr])
        case op_in:
            read_val, _ := reader.ReadByte()
            data[data_ptr] = int16(read_val)
        case op_jmp_fwd:
            if data[data_ptr] == 0 {
                pc = int(program[pc].operand)
            }
        case op_jmp_bck:
            if data[data_ptr] > 0 {
                pc = int(program[pc].operand)
            }
        default:
            panic("Unknown operator")
        }
    }
}

func main() {
    args := os.Args
    if len(args) != 2 {
        fmt.Printf("Usage: %s filename\n", args[0])
        return
    }
    filename := args[1]
    fileContents, err := ioutil.ReadFile(filename)
    if err != nil {
        fmt.Printf("Error reading %s\n", filename)
        return
    }
    program, err := compileBF(string(fileContents))
    if err != nil {
        fmt.Println(err)
        return
    }
    executeBF(program)
}
```

Input:

(Filename is input.bf and the source code is bfc.go)

``` plaintext
++++++++++[>+++++++>++++++++++>+++>+<<<<-]>++.>+.+++++++..+++.>++.<<+++++++++++++++.>.+++.------.--------.>+.>.
```

Use command

``` bash
$ go run bfc.go input.bf
```

Or compile the source code:

``` bash
$ go build bfc.go
$ gcc bfc.cpp -o bfc

$ ./bfc input.bf
```

Output:

``` plaintext
Hello World!
```

## More Information

Esolangs: <https://esolangs.org/wiki/Brainfuck>

StackOverflow: <https://stackoverflow.com/questions/16836860/how-does-the-brainfuck-hello-world-actually-work>
