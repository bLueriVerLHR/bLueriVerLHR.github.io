# 代码测试

`date: 2021-07-31`

---

一些代码小例子，不遵循个人代码规范。

<!--more-->

---

## C 解多元一次方程组

``` c
#include<stdio.h>
#include<stdlib.h>
#include<time.h>

int Start(){
    int n;
    printf("Nice to meet you,doctor.\n");
    printf("What do you wanne do today?\n");
    printf("Do you wanne calculate a system of first order equations of multiple variables.\n");
    printf("Or you wanna DO with me?|\'v \')\n");
    printf("Chose what you wanna to do.(/(///v///)/)\n\n");
    printf("0.Qiut.   1.Calculation.   2.DO with me?\n");
    while(1){
        if(scanf("%d",&n) == 1 && n < 4 && n > -1){
            return n;
            break;
        }else{
            printf("You should have replied to me with 1,2 or...0.(; _ ;)\n");
            printf("Please respond to me again.\n");
            getchar();
        }
    }
    getchar();
}

int DefM(int Matrix[],int row,int column){
    int i_BR = 1;
    char c_BR;
    while(i_BR){
        i_BR = 1;
        getchar();
        for(int i = 0;i < row;i++){
            for(int k = 0;k < column;k++){
                printf("Please Enter the number in %d row and %d column:",i+1,k+1);
                while (scanf(" %d", &Matrix[column*i+k]) != 1) {
                    while ((c_BR = getchar()) != '\n')  putchar(c_BR);
                    printf(" is not an integer.Please enter an integer value, such as 25, -178, or 3: ");
                }
                if(k == (column - 1))
                printf("\n");
            }
        }
        printf("The Matrix is like the following output.\n");
        for(int i = 0;i < row;i++){
            printf("\t|\t");
            for(int k = 0;k < column;k++){
                printf("%d\t",Matrix[column*i+k]);
                if(k == (column - 1))
                printf("|\n");
             }
        }  
        getchar();
        printf("\n\nIs the Matrix the one you expected?\nIf so,enter 1 to continue.\nIf not,enter 0 to define it again.\n");
        scanf("%c",&c_BR);
        while(i_BR == 1){
            if(c_BR == '1')
            i_BR = 0;
            else if(c_BR == '0'){
                system("cls");
                printf("Now recreat it.\n");
                break;
            }
            else{
                getchar();
                printf("please do not enter an irrelevant character.\nAnswer me again:");
                scanf("%c",&c_BR);
            }
        }
    }
}
     
int VarNum(){
    int n = 0;
    int m = 0;
    printf("Tell me how many variables you want to cope with?\n");
    while(1){
        if(scanf("%d",&n)){
            printf("Is %d the number of the variables you want to cope with?\n",n);
            printf("If it is,please enter 1.If not,enter 0 to rewrite it.\n");
            getchar();
            if(scanf("%d",&m)){
                if(m){
                    return n;
                    break;
                }
                else{
                    printf("Rewrite it!");
                    getchar();
                    continue;
                }
            }else{
                printf("You should enter an integer which is either 1 or 0.\n");
                printf("And now you exit.\nYou should enter again.\n\n");
                return 0;
                break;
            }
        }else{
            printf("Please enter an integer.\n");
            getchar();
        }
    }
}

int Calcu3Det(int MainMatrix[]){
    int PositiveProduct[3],NegativeProduct[3],PositiveSum = 0,NegativeSum = 0;
    for(int k = 0;k < 3;k++) PositiveProduct[k] = NegativeProduct[k] = 1;
    for(int k = 0;k < 3;k++){
        for(int i = 0;i < 3;i++){
            if( (3*i+i+k) >= (3*(i+1))) PositiveProduct[k] *= MainMatrix[3*i+i+k-3];
            else PositiveProduct[k] *= MainMatrix[3*i+i+k];
            if( (3*i+2-i+k) >= (3*(i+1))) NegativeProduct[k] *= MainMatrix[3*i-1-i+k];
            else NegativeProduct[k] *= MainMatrix[3*i+2-i+k];
        }
        PositiveSum += PositiveProduct[k];
        NegativeSum += NegativeProduct[k];
    }
    return PositiveSum - NegativeSum;
}

int CalcuHiDet(int MainMatrix[],int X){
    int sum;
    sum = 0;
    if(X == 3) sum = Calcu3Det(MainMatrix);
    else if(X > 3){
        int * AssoMatrix = (int *)malloc((X-1)*(X-1)*sizeof(int));
        int counter = 0,sign;
        for(int c = 0;c < X;c++){
            for(int k = 1;k < X;k++){
                for(int i = 0;i < X;i++){
                    if(i < c) AssoMatrix[(k-1)*(X-1)+i] = MainMatrix[X*k+i];
                    else if(i > c) AssoMatrix[(k-1)*(X-1)+i-1] = MainMatrix[X*k+i];
                }
            }
            counter = CalcuHiDet(AssoMatrix,X-1);
            sign = ((2+c)%2)?-1:1;
            sum += MainMatrix[c]*sign*counter;
        }
    }
    return sum;
}

int CopM(int MainMatrix[],int row,int column,int AssociateMatrix[]){
    for(int k = 0;k < row*column;k++) AssociateMatrix[k] = MainMatrix[k];
}

int ChangeC(int Matrix[],int row,int column,int ColumnMatrix[],int ChangedColumn){
    for(int k = 0;k < row;k++) Matrix[row*k + ChangedColumn-1] = ColumnMatrix[k];
}

int Calculation(int MainMatrix[],int Column[],int n){
    int D;
    int * AssoMatrix = (int *)malloc(n*n*sizeof(int));
    printf("\n");
    for(int i = 0;i < n;i++){
        for(int k = 0;k < n+1;k++){
            if(MainMatrix[n*i+k] == 0) printf("\t");
            else if(k < n - 1) printf("\t%d X%d +",MainMatrix[n*i+k],k+1);
            else if(k == n -1) printf("\t%d X%d =",MainMatrix[n*i+k],k+1);
            else if(k == n) printf("\t%d\n",Column[i]);
        }
    }
    printf("The system above have ");
    if((D = CalcuHiDet(MainMatrix,n)) == 0) printf("NO exact roots.");
    else{
        printf("roots.\nD = %d\n",D);
        for(int i = 0;i < n;i++){
            printf("X%d = D%d/D\t   ",i+1,i+1);
        }
        printf("\n");
        for(int i = 0;i < n;i++){
            CopM(MainMatrix,n,n,AssoMatrix);
            ChangeC(AssoMatrix,n,n,Column,i+1);
            printf("D%d = %d\t   ",i+1,CalcuHiDet(AssoMatrix,n));
        }
    }
}

int CalcuSystem(){
    int n = VarNum();
    if(n){
        int * Matrix = (int *)malloc(n*n*sizeof(int));
        int * Column = (int *)malloc(n*sizeof(int));
        printf("The coefficient matrix of the system: \n");
        DefM(Matrix,n,n);
        printf("The column matrix of the system: \n");
        DefM(Column,n,1);
        Calculation(Matrix,Column,n);
        printf("\nEnter to continue.\n");
        getchar();
    }
}
    
int talk(int n){
    switch (n%11)
    {
    case 0:
        printf("I would like to,but now we should study.\nEmm...We can do it at home.(whisper)\n");
        break;
    case 1:
        printf("DOCTOR DAISUKI !\n");
        break;
    case 2:
        printf("(Ten hours later)Emm...Doctor,you are so strong.(Biting your ear).\n");
        break;
    case 3:
        printf("Do you forget to work?Oh?Ah...I will be waiting for you!\n");
        break;
    case 4:
        printf("Do you forget your work?Oh?\n");
        break;
    case 5:
        printf("Just Joking.\n");
        break;
    case 6:
        printf("Magic,magic.Make doctor happier!\n");
        break;
    case 7:
        printf("Recommend you to listen to a song called the loop of love,doctor.\n");
        break;
    case 8:
        printf("You can got everything you want in your dreams,doctor.\n");
        break;
    case 9:
        printf("I was so shy to say the words.Embarrassment kills me....\n");
        break;
    case 10:
        printf("Doctor,my room it\'s upstairs.Shall we go now?(looking up to you)\n");
        break;
    default:
        printf("I...I haven\'t got ready./(///v///)/\n");
        break;
    }
    printf("\nEnter to contine\n\n");
    getchar();
}

int main(){
    int n;
    while(n = Start()){
        if(n == 1) CalcuSystem();
        else if(n == 2) {
            srand(time(NULL));
            talk(rand());
        }
        getchar();
    }
    printf("Have a nice day,doctor!\nBye!");
    getchar();
    getchar();
}
```

## C EPUB 文件制作框架

``` c
#include<stdio.h>
#include<stdlib.h>
#include<time.h>

void make_mimetype(){
    FILE * fp;
    fp = fopen("BookName/mimetype","w");
    fputs("application/epub+zip",fp);
}

void make_folder(){
    _mkdir("BookName");
    _mkdir("BookName/META-INF");
    _mkdir("BookName/OEBPS");
    _mkdir("BookName/OEBPS/Fonts");
    _mkdir("BookName/OEBPS/Images");
    _mkdir("BookName/OEBPS/Styles");
    _mkdir("BookName/OEBPS/Text");
}

void make_content(int chapnum,int picnum,int illnum){
    time_t t;
    struct tm *p;
    time(&t);
    p = gmtime(&t);
    FILE * fp;
    fp = fopen("BookName/OEBPS/content.opf","w");
    fprintf(fp,"<?xml version=\"1.0\" encoding=\"utf-8\"?>\n");
    fprintf(fp,"<package version=\"2.0\" unique-identifier=\"BookId\" xmlns=\"http://www.idpf.org/2007/opf\">\n");
    fprintf(fp,"\t<metadata xmlns:dc=\"http://purl.org/dc/elements/1.1/\" xmlns:opf=\"http://www.idpf.org/2007/opf\">\n");
    fprintf(fp,"\t\t<dc:identifier opf:scheme=\"UUID\" id=\"BookId\">urn:uuid:<!--uuid--></dc:identifier>\n");
    fprintf(fp,"\t\t<dc:title><!--书名--></dc:title>\n");
    fprintf(fp,"\t\t<dc:creator opf:role=\"aut\" opf:file-as=\"BlueRiver\"><!--作者名--></dc:creator>\n");
    fprintf(fp,"\t\t<dc:language>zh</dc:language>\n");
    fprintf(fp,"\t\t<dc:rights>BlueRiver</dc:rights>\n");
    fprintf(fp,"\t\t<dc:subject>轻小说</dc:subject>\n");
    fprintf(fp,"\t\t<dc:description>\n\t\t\t<!--简介-->\n\t\t</dc:description>\n");
    fprintf(fp,"\t\t<dc:source>BlueRiver</dc:source>\n");
    fprintf(fp,"\t\t<dc:publisher>BlueRiver</dc:publisher>\n");
    fprintf(fp,"\t\t<dc:date opf:event=\"publication\">%d-%d-%d</dc:date>\n",p->tm_year+1900,p->tm_mon+1,p->tm_mday);
    fprintf(fp,"\t\t<dc:date opf:event=\"modification\">%d-%d-%d</dc:date>\n",p->tm_year+1900,p->tm_mon+1,p->tm_mday);
    fputs("\t\t<meta name=\"Sigil version\" content=\"0.9.13\" />\n",fp);    
    fputs("\t\t<meta name=\"cover\" content=\"cover.jpg\"/>\n",fp);
    fputs("\t</metadata>\n",fp);
    fputs("\t<manifest>\n",fp);
    fputs("\t\t<item id=\"ncx\" href=\"toc.ncx\" media-type=\"application/x-dtbncx+xml\"/>\n",fp);
    fputs("\t\t<item id=\"postscript.xhtml\" href=\"postscript.xhtml\" media-type=\"application/xhtml+xml\"/>\n",fp);//后记
    fputs("\t\t<item id=\"message.xhtml\" href=\"Text/message.xhtml\" media-type=\"application/xhtml+xml\"/>\n",fp);//制作信息页
    fputs("\t\t<item id=\"introduction.xhtml\" href=\"Text/introduction.xhtml\" media-type=\"application/xhtml+xml\"/>\n",fp);//简介
    fputs("\t\t<item id=\"contents.xhtml\" href=\"Text/contents.xhtml\" media-type=\"application/xhtml+xml\"/>\n",fp);//目录
    fputs("\t\t<item id=\"cover.jpg\" href=\"Images/cover.jpg\" media-type=\"image/jpeg\"/>\n",fp);//封面
    fputs("\t\t<item id=\"cover.xhtml\" href=\"Text/cover.xhtml\" media-type=\"application/xhtml+xml\"/>\n",fp);
    fputs("\t\t<item id=\"title.xhtml\" href=\"Text/title.xhtml\" media-type=\"application/xhtml+xml\"/>\n",fp);//书名页
    //章节
    for(int k = 0;k < chapnum;k++){
        fprintf(fp,"\t\t<item id=\"chapter%03d.xhtml\" href=\"Text/chapter%03d.xhtml\" media-type=\"application/xhtml+xml\"/>\n",k+1,k+1);
    }
    //插图
    for(int k = 0;k < picnum;k++){
        fprintf(fp,"\t\t<item id=\"x%03d.jpg\" href=\"Images/%03d.jpg\" media-type=\"image/jpeg\"/>\n",k+1,k+1);
    }
    //彩图页
    for(int k = 0;k < illnum;k++){
        fprintf(fp,"\t\t<item id=\"illustration%d.xhtml\" href=\"Text/illustration%d.xhtml\" media-type=\"image/jpeg\"/>\n",k+1,k+1);
    }
    for(int k = 0;k < illnum;k++){
        fprintf(fp,"\t\t<item id=\"xc%03d.jpg\" href=\"Images/c%03d.jpg\" media-type=\"image/jpeg\"/>\n",k+1,k+1);
    }
    //此处默认字体文件和样式表文件名称
    fputs("\t\t<item id=\"style.css\" href=\"Styles/style.css\" media-type=\"text/css\"/>\n",fp);//样式表默认名称为style.css
    
    
    fputs("\t\t<item id=\" <!--此处填写文件名称--> \" href=\" <!--此处填写文件相对路径--> \" media-type=\" <!--此处填写文件格式--> \"/>\n",fp);
    /*
    文件格式例如：
    application/xhtml+xml
    application/x-font-ttf
    image/png
    image/jpeg
    text/css
    */


    fputs("\t</manifest>\n",fp);
    fputs("\t<spine toc=\"ncx\">\n",fp);
    fputs("\t\t<itemref idref=\"cover.xhtml\" properties=\"duokan-page-fullscreen\"/>\n",fp);
    fputs("\t\t<itemref idref=\"title.xhtml\"/>\n",fp);
    fputs("\t\t<itemref idref=\"message.xhtml\"/>\n",fp);
    fputs("\t\t<itemref idref=\"introduction.xhtml\"/>\n",fp);
    //彩图页
    for(int k = 0;k < illnum;k++){
        fprintf(fp,"\t\t<itemref idref=\"illustration%03d.xhtml\" properties=\"duokan-page-fitwindow\"/>\n",k+1);
    }
    fputs("\t\t<itemref idref=\"contents.xhtml\"/>\n",fp);
    //章节
    for(int k = 0;k < chapnum;k++){
        fprintf(fp,"\t\t<itemref idref=\"chapter%03d.xhtml\"/>\n",k+1);
    }
    fputs("\t\t<itemref idref=\"postscript.xhtml\"/>\n",fp);
    fputs("\t</spine>\n",fp);
    fputs("</package>",fp);
}

void make_container(){
    FILE * fp;
    fp = fopen("BookName/META-INF/container.xml","w");
    fputs("<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n",fp);
    fputs("<container version=\"1.0\" xmlns=\"urn:oasis:names:tc:opendocument:xmlns:container\">\n",fp);
    fputs("\t<rootfiles>\n",fp);
    fputs("\t\t<rootfile full-path=\"OEBPS/content.opf\" media-type=\"application/oebps-package+xml\"/>\n",fp);
    fputs("\t</rootfiles>\n",fp);
    fputs("</container>",fp);
}

void make_toc(int chapnum,int picnum,int illnum){
    FILE * fp;
    fp = fopen("BookName/OEBPS/toc.ncx","w");
    fputs("<?xml version=\"1.0\" encoding=\"utf-8\" ?>\n",fp);
    fputs("<!DOCTYPE ncx PUBLIC \"-//NISO//DTD ncx 2005-1//EN\" \"http://www.daisy.org/z3986/2005/ncx-2005-1.dtd\">\n",fp);
    fputs("<ncx version=\"2005-1\" xmlns=\"http://www.daisy.org/z3986/2005/ncx/\">\n",fp);
    fputs("\t<head>\n",fp);
    fputs("\t\t<meta content=\"urn:uuid:<!--uuid-->\" name=\"dtb:uid\"/>\n",fp);
    fputs("\t\t<meta content=\"1\" name=\"dtb:depth\"/>\n",fp);
    fputs("\t\t<meta content=\"0\" name=\"dtb:totalPageCount\"/>\n",fp);
    fputs("\t\t<meta content=\"0\" name=\"dtb:maxPageNumber\"/>\n",fp);
    fputs("\t</head>\n",fp);
    fputs("\t<docTitle>\n\t\t<text><!--书名--></text>\n\t<docTitle>\n",fp);
    fputs("\t<navMap>\n",fp);
    int i = 0;
    i += 1;
    fprintf(fp,"\t\t<navPoint id=\"navPoint-%d\" playOrder=\"%d\">\n\t\t\t<navLabel>\n\t\t\t\t<text>封面</text>\n\t\t\t</navLabel>\n\t\t\t<content src=\"Text/cover.xhtml\"/>\n\t\t</navPoint>\n",i,i);
    i += 1;
    fprintf(fp,"\t\t<navPoint id=\"navPoint-%d\" playOrder=\"%d\">\n\t\t\t<navLabel>\n\t\t\t\t<text>制作信息</text>\n\t\t\t</navLabel>\n\t\t\t<content src=\"Text/message.xhtml\"/>\n\t\t</navPoint>\n",i,i);
    i += 1;
    fprintf(fp,"\t\t<navPoint id=\"navPoint-%d\" playOrder=\"%d\">\n\t\t\t<navLabel>\n\t\t\t\t<text>简介</text>\n\t\t\t</navLabel>\n\t\t\t<content src=\"Text/introduction.xhtml\"/>\n\t\t</navPoint>\n",i,i);
    i += 1;
    fprintf(fp,"\t\t<navPoint id=\"navPoint-%d\" playOrder=\"%d\">\n\t\t\t<navLabel>\n\t\t\t\t<text>彩页</text>\n\t\t\t</navLabel>\n\t\t\t<content src=\"Text/illustration001.xhtml\"/>\n\t\t</navPoint>\n",i,i);
    i += 1;
    fprintf(fp,"\t\t<navPoint id=\"navPoint-%d\" playOrder=\"%d\">\n\t\t\t<navLabel>\n\t\t\t\t<text>目录</text>\n\t\t\t</navLabel>\n\t\t\t<content src=\"Text/contents.xhtml\"/>\n\t\t</navPoint>\n",i,i);
    for(int k = 0;k < chapnum;k++){
        i += 1;
        fprintf(fp,"\t\t<navPoint id=\"navPoint-%d\" playOrder=\"%d\">\n\t\t\t<navLabel>\n\t\t\t\t<text><!--章节名称--></text>\n\t\t\t</navLabel>\n\t\t\t<content src=\"Text/chapter%03d.xhtml\"/>\n\t\t</navPoint>\n",i,i,k+1);
    }
    i += 1;
    fprintf(fp,"\t\t<navPoint id=\"navPoint-%d\" playOrder=\"%d\">\n\t\t\t<navLabel>\n\t\t\t\t<text>后记</text>\n\t\t\t</navLabel>\n\t\t\t<content src=\"Text/postscript.xhtml\"/>\n\t\t</navPoint>\n",i,i);
    fputs("\t</navMap>\n",fp);
    fputs("</ncx>\n",fp);
}

void make_title(){
    FILE * fp;
    fp = fopen("BookName/OEBPS/Text/title.xhtml","w");
    fputs("<?xml version=\"1.0\" encoding=\"utf-8\"?>\n",fp);
    fputs("<!DOCTYPE html PUBLIC \"-//W3C//DTD XHTML 1.1//EN\" \"http://www.w3.org/TR/xhtml11/DTD/xhtml11.dtd\">\n",fp);
    fputs("<html xmlns=\"http://www.w3.org/1999/xhtml\" xml:lang=\"zh-CN\">\n",fp);
    fputs("\t<head>\n",fp);
    fputs("\t\t<title>标题</title>\n",fp);
    fputs("\t\t<link href=\"../Styles/style.css\" type=\"text/css\" rel=\"stylesheet\"/>\n",fp);
    fputs("\t</head>\n",fp);
    fputs("\t<body>\n",fp);
    fputs("\t\t<h1><!--书名--><h1>\n",fp);
    fputs("\t</body>\n",fp);
    fputs("</html>\n",fp);
}

void make_message(){
    FILE * fp;
    fp = fopen("BookName/OEBPS/Text/message.xhtml","w");
    fputs("<?xml version=\"1.0\" encoding=\"utf-8\"?>\n",fp);
    fputs("<!DOCTYPE html PUBLIC \"-//W3C//DTD XHTML 1.1//EN\" \"http://www.w3.org/TR/xhtml11/DTD/xhtml11.dtd\">\n",fp);
    fputs("<html xmlns=\"http://www.w3.org/1999/xhtml\" xml:lang=\"zh-CN\">\n",fp);
    fputs("\t<head>\n",fp);
    fputs("\t\t<title>制作信息</title>\n",fp);
    fputs("\t\t<link href=\"../Styles/style.css\" type=\"text/css\" rel=\"stylesheet\"/>\n",fp);
    fputs("\t</head>\n",fp);
    fputs("\t<body>\n",fp);
    fputs("\t\t<h1 class=\"makertitle\">制作信息</h1>\n",fp);
    fputs("\t\t<p class=\"cutline\">≡≡≡≡≡≡≡≡≡≡≡≡≡≡≡≡≡≡</p>\n",fp);
    fputs("\t\t<h1><!--书名--><h1>\n",fp);
    fputs("\t\t<p class=\"makerifm\">作者：</p>\n",fp);
    fputs("\t\t<p class=\"makerifm\">插画：</p>\n",fp);
    fputs("\t\t<p class=\"makerifm\">译者：</p>\n",fp);
    fputs("\t\t<p class=\"makerifm\">图源：</p>\n",fp);
    fputs("\t\t<p class=\"makerifm\">录入：</p>\n",fp);
    fputs("\t\t<p class=\"makerifm\">仅供个人学习交流使用，禁作商业用途</p>\n",fp);
    fputs("\t\t<p class=\"makerifm\">下载后请在24小时内删除</p>\n",fp);
    fputs("\t\t<p class=\"makerifm\">请尊重翻译、扫图、录入、校对的辛勤劳动，转载请保留信息</p>\n",fp);
    fputs("\t\t<p class=\"makerifm\">≡≡≡≡≡≡≡≡≡≡≡≡≡≡≡≡≡≡</p>\n",fp);
    fputs("\t</body>\n",fp);
    fputs("</html>\n",fp);
}

void make_cover(){
    FILE * fp;
    fp = fopen("BookName/OEBPS/Text/cover.xhtml","w");
    fputs("<?xml version=\"1.0\" encoding=\"utf-8\"?>\n",fp);
    fputs("<!DOCTYPE html PUBLIC \"-//W3C//DTD XHTML 1.1//EN\" \"http://www.w3.org/TR/xhtml11/DTD/xhtml11.dtd\">\n",fp);
    fputs("<html xmlns=\"http://www.w3.org/1999/xhtml\" xml:lang=\"zh-CN\">\n",fp);
    fputs("\t<head>\n",fp);
    fputs("\t\t<title>标题</title>\n",fp);
    fputs("\t\t<link href=\"../Styles/style.css\" type=\"text/css\" rel=\"stylesheet\"/>\n",fp);
    fputs("\t</head>\n",fp);
    fputs("\t<body>\n",fp);
    fputs("\t\t<div class=\"cover duokan-image-single\"><img alt=\"cover\" src=\"../Images/cover.jpg\"/></div>\n",fp);
    fputs("\t</body>\n",fp);
    fputs("</html>\n",fp);
}

void make_introduction(){
    FILE * fp;
    fp = fopen("BookName/OEBPS/Text/introduction.xhtml","w");
    fputs("<?xml version=\"1.0\" encoding=\"utf-8\"?>\n",fp);
    fputs("<!DOCTYPE html PUBLIC \"-//W3C//DTD XHTML 1.1//EN\" \"http://www.w3.org/TR/xhtml11/DTD/xhtml11.dtd\">\n",fp);
    fputs("<html xmlns=\"http://www.w3.org/1999/xhtml\" xml:lang=\"zh-CN\">\n",fp);
    fputs("\t<head>\n",fp);
    fputs("\t\t<title>简介</title>\n",fp);
    fputs("\t\t<link href=\"../Styles/style.css\" type=\"text/css\" rel=\"stylesheet\"/>\n",fp);
    fputs("\t</head>\n",fp);
    fputs("<body>\n",fp);
    fputs("<div>\n",fp);
    fputs("<h1 class=\"color1 fzzys\">简介</h1>\n",fp);
    fputs("\n",fp);
    fputs("</div>\n",fp);
    fputs("</body>\n",fp);
    fputs("</html>\n",fp);
}

const char illpath[50] = "BookName/OEBPS/Text/illustration001.xhtml";

void make_illustration(int illnum){
    FILE * fp;
    char pa[50];
    for(int n = 0;n < illnum;n++){
        for(int i = 0; i < 32;i++){
            pa[i] = illpath[i];
        }
        for(int i = 35; i <= 50;i++){
            pa[i] = illpath[i];
        }
        pa[32] = illpath[32] + n/100;
        pa[33] = illpath[33] + n/10 - (n/100)*10;
        pa[34] = illpath[34] + n%10;
        fp = fopen(pa,"w");
        fputs("<?xml version=\"1.0\" encoding=\"utf-8\"?>\n",fp);
        fputs("<!DOCTYPE html PUBLIC \"-//W3C//DTD XHTML 1.1//EN\" \"http://www.w3.org/TR/xhtml11/DTD/xhtml11.dtd\">\n",fp);
        fputs("<html xmlns=\"http://www.w3.org/1999/xhtml\" xml:lang=\"zh-CN\">\n",fp);
        fputs("\t<head>\n",fp);
        fprintf(fp,"\t\t<title>彩页%d</title>\n",n+1);
        fputs("\t\t<link href=\"../Styles/style.css\" type=\"text/css\" rel=\"stylesheet\"/>\n",fp);
        fputs("\t</head>\n",fp);
        fputs("\t<body>\n",fp);
        fputs("\t\t<div>\n",fp);
        fprintf(fp,"\t\t\t<div class=\"center duokan-image-single\"><img alt=\"c%03d\" src=\"../Images/c%03d.jpg\"/></div>\n",n+1);
        fputs("\t\t</div>\n",fp);
        fputs("\t</body>\n",fp);
        fputs("</html>\n",fp);
    }
}

void make_postscript(){
    FILE * fp;
    fp = fopen("BookName/OEBPS/Text/postscript.xhtml","w");
    fputs("<?xml version=\"1.0\" encoding=\"utf-8\"?>\n",fp);
    fputs("<!DOCTYPE html PUBLIC \"-//W3C//DTD XHTML 1.1//EN\" \"http://www.w3.org/TR/xhtml11/DTD/xhtml11.dtd\">\n",fp);
    fputs("<html xmlns=\"http://www.w3.org/1999/xhtml\" xml:lang=\"zh-CN\">\n",fp);
    fputs("\t<head>\n",fp);
    fputs("\t\t<title>后记</title>\n",fp);
    fputs("\t\t<link href=\"../Styles/style.css\" type=\"text/css\" rel=\"stylesheet\"/>\n",fp);
    fputs("\t</head>\n",fp);
    fputs("<body>\n",fp);
    fputs("<h1 class=\"fzzys\">后记</h1>\n",fp);
    fputs("\n",fp);
    fputs("</body>\n",fp);
    fputs("</html>\n",fp);
}

void make_contents(int chapnum){
    FILE * fp;
    fp = fopen("BookName/OEBPS/Text/contents.xhtml","w");
    fputs("<?xml version=\"1.0\" encoding=\"utf-8\"?>\n",fp);
    fputs("<!DOCTYPE html PUBLIC \"-//W3C//DTD XHTML 1.1//EN\" \"http://www.w3.org/TR/xhtml11/DTD/xhtml11.dtd\">\n",fp);
    fputs("<html xmlns=\"http://www.w3.org/1999/xhtml\" xml:lang=\"zh-CN\">\n",fp);
    fputs("\t<head>\n",fp);
    fputs("\t\t<title>Contents</title>\n",fp);
    fputs("\t\t<link href=\"../Styles/style.css\" type=\"text/css\" rel=\"stylesheet\"/>\n",fp);
    fputs("\t</head>\n",fp);
    fputs("\t<body>\n",fp);
    fputs("\t\t<div class=\"contents\">\n",fp);
    fputs("\t\t\t<div class=\"box\">\n",fp);
    fputs("\t\t\t\t<h2>CONTENTS</h2>\n",fp);
    fputs("\t\t\t\t<table border=\"0\" cellspacing=\"0\" cellpadding=\"0\">\n",fp);
    fputs("\t\t\t\t\t<tbody>\n",fp);
    for(int k = 0;k < chapnum;k++){
        fputs("\t\t\t\t\t\t<tr>\n",fp);
        fprintf(fp,"\t\t\t\t\t\t\t<td><a class=\"nodeco colorg\" href=\"../Text/chapter%03d.xhtml\"><!--样式--></a></td>\n",k+1);
        fprintf(fp,"\t\t\t\t\t\t\t<td><a class=\"nodeco colorg\" href=\"../Text/chapter%03d.xhtml\"><!--章节标题--></a></td>\n",k+1);
        fputs("\t\t\t\t\t\t</tr>\n",fp);
    }
    fputs("\t\t\t\t\t\t<tr>\n",fp);
    fputs("\t\t\t\t\t\t\t<td></td>\n",fp);
    fputs("\t\t\t\t\t\t\t<td><a class=\"nodeco colorg\" href=\"../Text/postscript.xhtml\">后记</a></td>\n",fp);
    fputs("\t\t\t\t\t\t</tr>\n",fp);
    fputs("\t\t\t\t\t</tbody>\n\t\t\t\t</table>\n\t\t\t</div>\n\t\t</div>\n",fp);
    fputs("\t</body>\n",fp);
    fputs("</html>\n",fp);
}

void make_content_toc_text(int chapnum,int picnum,int illnum){
    make_content(chapnum,picnum,illnum);
    make_toc(chapnum,picnum,illnum);
    make_title();
    make_message();
    make_cover();
    make_introduction();
    make_illustration(illnum);
    make_postscript();
    make_contents(chapnum);
}

void make_basicss(){
    FILE * fp;
    fp = fopen("BookName/OEBPS/Styles/style.css","w");
    fputs("/*基础样式*/\n",fp);
    fputs("body{padding: 0%;margin-top: 0%;margin-bottom: 0%;margin-left: 1%;margin-right: 1%;line-height:1.2;text-align: justify;}\n",fp);
    fputs("p {text-indent:2em;display:block;line-height:1.3;margin-top:0.6em;margin-bottom:0.6em;}\n",fp);
    fputs("div {margin:0px;padding:0px;line-height:1.2;text-align: justify;}\n",fp);
    fputs("li{ clear:both; display:block}\n",fp);
    fputs("td{padding:3px 0px}\n",fp);
    fputs("\n",fp);
    fputs("\n",fp);
    fputs("/*封面样式*/\n",fp);
    fputs(".cover {margin: 0px;padding: 0px;text-indent: 0;text-align: center !important;}\n",fp);
    fputs("\n",fp);
    fputs("\n",fp);
    fputs("/*制作信息页样式*/\n",fp);
    fputs(".makertitle{font-size: 1.3em;text-indent: 0em;font-weight: bold;margin-top: 0.5em;margin-bottom: 0.5em;}\n",fp);
    fputs(".cutline{text-indent: 0em;line-height: 0;margin-top: 0.3em;margin-bottom: 0.3em;}\n",fp);
    fputs(".makerifm{text-indent: 0em;line-height: 1.2;margin-top: 0.2em;margin-bottom: 0.2em;}\n",fp);
    fputs("\n",fp);
    fputs("\n",fp);
    fputs("/*Logo页样式*/\n",fp);
    fputs(".logoarea{text-indent: 0em;text-align:center !important;margin-top: 20%;margin-bottom: 0%;}\n",fp);
    fputs(".logoimage{width:100%;}\n",fp);
    fputs("\n",fp);
    fputs("\n",fp);
    fputs("/*目录页样式*/\n",fp);
    fputs("/*“目录”标题颜色*/\n",fp);
    fputs(".colorco{color:#000000}\n",fp);
    fputs("/*目录页超链接样式*/\n",fp);
    fputs(".nodeco{text-decoration:none}\n",fp);
    fputs("/*目录页超链接颜色*/\n",fp);
    fputs(".colorg{color:#000000}\n",fp);
    fputs("\n",fp);
    fputs("\n",fp);
    fputs("/*正文样式*/\n",fp);
    fputs("/*正文章节标题样式*/\n",fp);
    fputs("h1 {font-size: 1.3em;line-height: 1.2;margin-top: 1em;margin-bottom: 1.2em;font-weight: bold;text-align: center !important;}\n",fp);
    fputs("/*注释代码样式*/\n",fp);
    fputs(".po{font-size:0.9em;text-indent:-0.8em;padding: 0em 0.1em 0.1em 1em;color:#960014}\n",fp);
    fputs("/*正文插图样式*/\n",fp);
    fputs(".kuan{duokan-bleed:leftright}\n",fp);
    fputs(".zhai{duokan-bleed:lefttopright}\n",fp);
    fputs("/*上标样式*/\n",fp);
    fputs("ruby{ruby-align:center}\n",fp);
    fputs("rt{font-size:0.7em;}\n",fp);
    fputs("/*下标黑点着重号*/\n",fp);
    fputs(".zzh {text-emphasis-style:dot;text-emphasis-position:under;-webkit-text-emphasis-style:dot;-webkit-text-emphasis-position:under;-webkit-text-emphasis-style:dot;-epub-text-emphasis-style:dot;}\n",fp);
    fputs("\n",fp);
    fputs("\n",fp);
    fputs("/*字体样式控制*/\n",fp);
    fputs("/*字体加粗*/\n",fp);
    fputs(".bold{font-weight:bold}\n",fp);
    fputs("/*字体高度*/\n",fp);
    fputs(".font03{font-size: 0.3em}\n",fp);
    fputs(".font04{font-size: 0.4em}\n",fp);
    fputs(".font05{font-size: 0.5em}\n",fp);
    fputs(".font06{font-size: 0.6em}\n",fp);
    fputs(".font07{font-size: 0.7em}\n",fp);
    fputs(".font075{font-size: 0.75em}\n",fp);
    fputs(".font08{font-size: 0.8em}\n",fp);
    fputs(".font085{font-size: 0.85em}\n",fp);
    fputs(".font09{font-size: 0.9em}\n",fp);
    fputs(".font10{font-size: 1.0em}\n",fp);
    fputs(".font11{font-size: 1.1em}\n",fp);
    fputs(".font115{font-size: 1.15em}\n",fp);
    fputs(".font12{font-size: 1.2em}\n",fp);
    fputs(".font13{font-size: 1.3em}\n",fp);
    fputs(".font14{font-size: 1.4em}\n",fp);
    fputs(".font15{font-size: 1.5em}\n",fp);
    fputs(".font16{font-size: 1.6em}\n",fp);
    fputs(".font17{font-size: 1.7em}\n",fp);
    fputs(".font18{font-size: 1.8em}\n",fp);
    fputs(".font19{font-size: 1.9em}\n",fp);
    fputs(".font20{font-size: 2em}\n",fp);
    fputs(".font25{font-size: 2.5em}\n",fp);
    fputs(".font30{font-size: 3em}\n",fp);
    fputs(".font40{font-size: 4em}\n",fp);
    fputs(".font35{font-size: 3.5em}\n",fp);
    fputs(".font45{font-size: 4.5em}\n",fp);
    fputs("/*首行缩进值为0*/\n",fp);
    fputs(".in0{text-indent:0em}\n",fp);
    fputs("/*文本居中*/\n",fp);
    fputs(".center{text-align:center !important;text-indent:0em;}\n",fp);
    fputs("/*文本居左*/\n",fp);
    fputs(".left{text-align:left !important;duokan-text-indent:0em;text-indent:0em;}\n",fp);
    fputs("/*文本居右*/\n",fp);
    fputs(".right{text-align:right !important;text-indent:0em;}\n",fp);
    fputs("/*斜体的字体样式*/\n",fp);
    fputs(".italic{font-style:italic}\n",fp);
    fputs("/*倾斜的字体样式*/\n",fp);
    fputs(".oblique{font-style:oblique}\n",fp);
    fputs("\n",fp);
    fputs("\n",fp);
    fputs("/*字体颜色控制*/\n",fp);
    fputs(".colorc1{color:#000000}/*书名颜色，默认黑色。*/\n",fp);
    fputs(".colorc2{color:#000000}/*卷数颜色，默认黑色。*/\n",fp);
    fputs(".color1{color:#000000}/*印象色，用于制作者人名、章节标题等处，默认黑色。*/\n",fp);
    fputs("/*补充颜色写在下面，并注明用处*/\n",fp);
    fputs("\n",fp);
    fputs("\n",fp);
    fputs("/*元素控制样式*/\n",fp);
    fputs("/*td元素顶端对齐*/\n",fp);
    fputs(".tdtop{vertical-align:top}\n",fp);
    fputs("/*td元素底端对齐*/\n",fp);
    fputs(".tdbottom{vertical-align:bottom}\n",fp);
    fputs("/*td元素垂直居中对齐*/\n",fp);
    fputs(".tdmiddle{vertical-align:middle}\n",fp);
    fputs("/*td元素水平居中*/\n",fp);
    fputs(".tdcenter{margin-left:auto; margin-right:auto;}\n",fp);
    fputs("/*元素宽度*/\n",fp);
    fputs(".w05{width:0.5em}\n",fp);
    fputs(".w07{width:0.7em}\n",fp);
    fputs(".w09{width:0.9em}\n",fp);
    fputs(".w10{width:1em}\n",fp);
    fputs(".w11{width:1.1em}\n",fp);
    fputs(".w26{width:2.6em}\n",fp);
    fputs(".w33{width:3.3em}\n",fp);
    fputs(".w37{width:3.7em}\n",fp);
    fputs(".w40{width:4em}\n",fp);
    fputs(".w44{width:4.4em}\n",fp);
    fputs(".w55{width:5.5em}\n",fp);
    fputs(".w70{width:70%%}\n",fp);
    fputs(".w100{width:100%%}\n",fp);
    fputs("/*元素顶部外边距*/\n",fp);
    fputs(".mtb13{margin-top:-1.3em;}\n",fp);
    fputs(".mtb09{margin-top:-0.9em;}\n",fp);
    fputs(".mtb05{margin-top:-0.5em;}\n",fp);
    fputs(".mtb03{margin-top:-0.3em;}\n",fp);
    fputs(".mt03{margin-top:0.3em;}\n",fp);
    fputs(".mt05{margin-top:0.5em;}\n",fp);
    fputs(".mt09{margin-top:0.9em;}\n",fp);
    fputs(".mt13{margin-top:1.3em;}\n",fp);
    fputs(".mt45{margin-top:4.5em;}\n",fp);
    fputs("/*元素上下外边距*/\n",fp);
    fputs(".mbt05{margin-top:0.5em; margin-bottom:0.5em;}\n",fp);
    fputs(".mbt09{margin-top:0.9em; margin-bottom:0.9em;}\n",fp);
    fputs(".mbt15{margin-top:1.5em; margin-bottom:1.5em;}\n",fp);
    fputs(".mbt18{margin-top:1.8em; margin-bottom:1.8em;}\n",fp);
    fputs("/*元素上下内边距*/\n",fp);
    fputs(".pbt09{padding-top:0.9em; padding-bottom:0.9em;}\n",fp);
    fputs("/*行高控制*/\n",fp);
    fputs(".h04{line-height:0.4;vertical-align:center;}\n",fp);
    fputs(".h11{line-height:1.1;vertical-align:center;}\n",fp);
    fputs(".h20{line-height:2;vertical-align:bottom;}\n",fp);
    fputs("\n",fp);
    fputs("\n",fp);
    fputs("/*标题样式*/\n",fp);
    fputs(".b-relative {width: 30em;margin-left: auto;margin-right: auto;margin-top: 0.5em;margin-bottom: 0em;min-height: 20em;max-width:100%%;min-width:18em;}\n",fp);
    fputs(".rota {-o-transform: rotate(5deg);-ms-transform: rotate(5deg);-moz-transform: rotate(5deg);-webkit-transform:rotate(5deg);transform: rotate(5deg);}\n",fp);
    fputs(".box1 {width: 2em;height: 2em;border-radius: 15%%;padding: 0.5em;background-color: #000000;color: #FFFFFF;float: right;margin-top: -0.5em;margin-right: 0.5em;}\n",fp);
    fputs(".box2 {border-radius: 20%%;width: 1em;height: 1em;background-color: #000000;padding: 0.5em;color: #FFFFFF;float: right;margin-right: -3.5em;margin-top: 2em;}\n",fp);
    fputs(".t-top {font-size: 0.9em;margin-left: 1em;float: right;margin-top: 1em;color: #FFFFFF;margin-right: -2.7em;}\n",fp);
    fputs(".f-right {float: right;}\n",fp);
    fputs(".f-left {float: left;}\n",fp);
    fputs(".tt {margin-top: -0.9em;}\n",fp);
    fputs(".tt1 {margin: 0em;padding: 0em;text-indent: 0px;text-align: center;}\n",fp);
    fputs(".tt2 {margin-top: -2em;margin-right: 0.5em;text-align: center;}\n",fp);
    fputs(".tt3 {margin: 0em;padding: 0em;text-indent: 0px;text-align: center;}\n",fp);
    fputs(".tl{margin-top: 4em;}\n",fp);
    fputs(".tr {-o-transform: rotate(35deg);-ms-transform: rotate(35deg);-moz-transform: rotate(35deg);-webkit-transform: rotate(35deg);transform: rotate(35deg);}\n",fp);
    fputs(".tr1 {margin-top: -0.5em;text-indent: 0px;}\n",fp);
    fputs(".shadow {text-shadow: 1px 1px 5px #000000;color: #FFFFFF;}\n",fp);
    fputs(".clear {clear: both;}\n",fp);
    fputs(".tt2 p {margin-top: -0.1em;padding: 0em;text-indent: 0px;text-align: center;margin-bottom: 0em;margin-left: 0em;margin-right: 0em;}\n",fp);
    fputs("/*自定义*/\n",fp);
    fputs(".contents h2 {padding: 0em;margin: 0.5em 0em 1em 0em;font-weight: bold;line-height: 120%%;font-size: 2.5em;}\n",fp);
    fputs(".contents .box {width: 25em;margin-left: auto;margin-right: auto;}\n",fp);
    fputs(".contents table {width: 100%%;}\n",fp);
    fputs(".contents td {padding: 0.25em 0.5em;text-align: left;}\n",fp);
    fputs(".border {padding:0.5em;border: 1px solid #000000;}\n",fp);
}

int make_epub_frame(){
    int chapnum,picnum,illnum;
    printf("Now we are going to make a basic frame of an epub.\n");
    printf("Now tell me how many chapters do this book has?\n");
    while(scanf(" %d",&chapnum) <= 0){
        getchar();
        printf("Please enter an integer such as 1 , 20 , 284.\n");
    }
    printf("Now tell me how many pictures which are black and whit do this book has?\n");
    while(scanf(" %d",&picnum) <= 0){
        getchar();
        printf("Please enter an integer such as 1 , 20 , 284.\n");
    }
    printf("Now tell me how many colorful pictures do this book has?\n");
    while(scanf(" %d",&illnum) <= 0){
        getchar();
        printf("Please enter an integer such as 1 , 20 , 284.\n");
    }
    make_mimetype();
    make_folder();
    make_container();
    make_content_toc_text(chapnum,picnum,illnum);
    make_basicss();
    return chapnum;
}

//字体库需要自己额外加装和设置

const char path[40] = "BookName/OEBPS/Text/chapter001.xhtml";

void make_chapter(int chapnum){
    int n = 0,test = -1;
    FILE * fp,* fw;
    if((fp = fopen("raw.txt","r")) == NULL){
        printf("Can\'t find the file.");
        exit(0);
    }
    char pa[40];
    while((chapnum - n) != -1 && test != n){
        test = n;
        for(int i = 0; i < 27;i++){
            pa[i] = path[i];
        }
        for(int i = 30; i <= 40;i++){
            pa[i] = path[i];
        }
        pa[27] =path[27] + n/100;
        pa[28] =path[28] + n/10 - (n/100)*10;
        pa[29] =path[29] + n%10;
        char ch;
        fw = fopen(pa,"w");
        fputs("<?xml version=\"1.0\" encoding=\"utf-8\"?>\n",fw);
        fputs("<!DOCTYPE html PUBLIC \"-//W3C//DTD XHTML 1.1//EN\" \"http://www.w3.org/TR/xhtml11/DTD/xhtml11.dtd\">\n",fw);
        fputs("<html xmlns=\"http://www.w3.org/1999/xhtml\" xml:lang=\"zh-CN\">\n",fw);
        fputs("\t<head>\n",fw);
        fputs("\t\t<title><!--章节名称--></title>\n",fw);
        fputs("\t\t<link href=\"../Styles/style.css\" type=\"text/css\" rel=\"stylesheet\"/>\n",fw);
        fputs("\t</head>\n",fw);
        fputs("\t<body>\n",fw);
        fputs("\t\t<h1 class=\"fzzys\"><!--章节名称--></h1>\n",fw);
        fputs("\t\t<p>",fw);
        int judge = 1;
        while((ch = getc(fp)) != EOF){
            if(ch == '\r'||ch == '\n'){
                if(judge == 0) continue;
                fprintf(fw,"</p>%c\t\t<p>",ch);
                judge = 0;
            }else if(ch == '\"'){
                fprintf(fw,"&quot;");
                judge = 1;
            }else if(ch == '<'){
                fprintf(fw,"&lt;");
                judge = 1;
            }else if(ch == '>'){
                fprintf(fw,"&gt;");
                judge = 1;
            }else if(ch == '$'){
                judge = 1;
                n += 1;
                break;
            }else if(ch == ' ' || ch == '\t'){
                continue;
            }
            else{
                judge = 1;
                fprintf(fw,"%c",ch);
            }
        }
        fputs("\t\t</p>\n\t</body>\n",fw);
        fputs("</html>\n",fw);
    }
}

int main(){
    int chapnum;
    chapnum = make_epub_frame();
    printf("The frame is created.\n");
    printf("Now name a file named raw.txt.\n");
    printf("If you wanna to leave.Do not creat the file or delete it.\n");
    printf("If you wanna continue to create chapters,save the text of the chapter in the file.\n");
    printf("You can enter $ to seperate the chapters.\n");
    printf("If you are ready,enter to start.\n");
    system("pause");
    make_chapter(chapnum);
}
```

## C 不溢出的乘法

``` c
#define A 20000                                                         //第一个乘数的位数
#define B 20000                                                         //第二个乘数的位数
#include<stdio.h>                                                       //输入输出
#include<string.h>                                                      //计算数字长度
#include<time.h>                                                        //计算时间
typedef struct {
    char m[2];
}temporary;

temporary tem[A];                                                       //竖式两个横线之间，一位乘法的结果

typedef struct {
    char m[A];
}rpg;

rpg temrpg[B];                                                          //竖式里下面一个数字乘上面各位后得到的数字


void initialtempo(temporary * pt){                                      //初始化
    for(int i = 0;i < A;i++){
        pt[i].m[0] = pt[i].m[1] = '0';
    }
}

void initialrpg(rpg * pt){                                              //初始化
    for(int i = 0;i < B;i++){
        for(int k = 0;k < A;k++){
            pt[i].m[k] = '0';
        }
    }
}

void addend(rpg * pr,char * c,int la,int lb){                           //将每一位乘a得到的结果相加
    int a[B] = {0};                                                     //保存进位
    for(int i = 0,k = 0,r;i < la + lb;i++,k = 0){
        for(int p = 0;p < i + 1;p++){
            if(pr[i - p].m[p] != '\0') k += pr[i - p].m[p] - '0';       //如果当位不为0，加上b中某位乘a的相应位数，用以替代加和时需要用的10^n
        }
        if(i - 1 >= 0) k += a[i - 1];                                   //加上进位
        r = k/10;                                                       //得到进位
        k = k%10;                                                       //得到本位
        a[i] = r;                                                       //保存进位
        c[i] = k + '0';                                                 //保存本位
    }
    int i = 0;                                                          //用来得到数字的末尾
    while(c[la+lb-i] == '\0'){                                          //忽略'\0'
        i += 1;
    }
    while(c[la+lb-i] == '0'){                                           //忽略'0'
        i += 1;
    }
    int f = la+lb-i+2;                                                  //保存结尾位置
    char temc[A+B];
    for(int j = 0;j < f - 1;j++){                                       //获得最终数字的正常顺序
        temc[j] = c[f - j - 2];
    }
    for(int j = 0;j < f - 1;j++){                                       //返回给最初预留的数组
        c[j] = temc[j];
    }
    c[f - 1] = '\0';                                                    //保险，给个结尾
}

void addtem(temporary * pt,rpg * pr,int la,int lb,int p){               //计算得到的每一位乘出的结果
    int a[B] = {0};                                                     //逢十进一用的数组
    for(int i = 0,k = 0,r;i < la + lb;i++,k = 0){                                               
        if(pt[i].m[0] != '\0') k = pt[i].m[0] - '0';                    //如果当位不是0，把保存的第一位给当位
        if(i - 1 >= 0){
            if(pt[i - 1].m[1] != '\0') k += pt[i - 1].m[1] - '0';       //如果上一位对应保存的第二位不为0，把保存的第二位给当位
        }
        if(i - 1 >= 0) k += a[i - 1];                                   //如果上一位有进位，给当位
        r = k/10;                                                       //是否有进位
        k = k - r * 10;                                                 //得到本位数字
        a[i] = r;                                                       //保存进位
        pr[p].m[i] = k + '0';                                           //保存当位数字
    }
}

void product(char * a,char *b,char * c,temporary * pt,rpg * pr){        //乘法程序
    clock_t t1 = clock();                                               //开始计时
    char tema[A] = {'0'},temb[B] = {'0'};                               //初始化两个数字的倒序形式，如123，记为321
    int la = strlen(a),lb = strlen(b);                                  //保存两个数字的实际位数
    for(int i = 0;i < la;i++){                                          //倒序a
        tema[i] = a[la - i - 1];
    }
    tema[la] = '\0';
    for(int i = 0;i < lb;i++){                                          //倒序b
        temb[i] = b[lb - i - 1];
    }
    temb[lb] = '\0';
    for(int i = 0;i < lb;i++){                                          //用b的每一位乘a并保存结果，分为第一位（0）和第二位（1）。（第二位可以为0）
        for(int p = 0,q = 0,r;p < la;p++,q = 0){
            q = (tema[p] - '0') * (temb[i] - '0');                      //个位乘法
            r = q/10;                                                   //是否有进位
            pt[p].m[0] = q - r * 10 + '0';                              //得到第一位
            pt[p].m[1] = r + '0';                                       //得到第二位
        }
        addtem(pt,pr,la,lb,i);                                          //计算每一位乘a得到的结果
    }
    addend(pr,c,la,lb);                                                 //将以上每一位乘a得到的结果相加
    clock_t t2 = clock();                                               //计时结束
    printf("%s",c);                                                     //打印数字
    printf("\n\n%d",t2 - t1);                                           //打印时间
}

char a[A] = {'0'},b[B] = {'0'},c[A+B] = {'0'};                          //保存两个数字并为结果预留空间


/*To calculate the product of a and b.(each of them must be positive)
**
**我们小学学习的竖式乘法算法如下：
**
**  1 2 3 4 5
**X         4
**___________
**        2 0
**      1 6
**    1 2
**    8
**  4    
**___________
**  4 9 3 8 0
**
**该乘法原理即为上式
**如果第二个乘数位数比第一个乘数位数小，计算会更快。
**所有数字计算的时候均用倒序形式，如123变成321计算
*/

int main(){
    temporary * pt = tem;                                               //传递结构数据
    rpg * pr = temrpg;                                                  //传递结构数据
    initialtempo(pt);                                                   //初始化
    initialrpg(pr);                                                     //初始化
    scanf("%s %s",a,b);                                                 //读取两个乘数
    product(a,b,c,pt,pr);                                               //计算并打印
}
```

## C 数字炸弹

``` c
#include<stdio.h>
#include<stdlib.h>
int main(){
    //变量
    char c_TheRequest = 1;//开始界面的字符
    int in_Deltar = 1,in_EnteredNumber,in_Sig;//游戏中输入数字及其判定所需要的数字
    int in_GivenNum = 0,in_An = 0,in_Bn = 0;//出的数字，和数字区间
    int in_Mid;//用来交换An、Bn的值以满足An<Bn的中间量
    int in_DistantAn,in_DistantBn;//An与Bn离num的距离
    int in_TemporaryAnSaver,in_TemporaryBnSaver;//临时用于比较的An、Bn储存器
    
    //开始界面
    printf("If you just happen to open the game and do not have the intention to play it.\n");
    printf("You can enter a q to quit or you can enter an s to start the game now!\n");
    scanf("%c",&c_TheRequest);
    getchar();
    while (c_TheRequest != 's' && c_TheRequest != 'q'){
        printf("Please do not enter a irrelevant letter.\n");
        scanf("%c",&c_TheRequest);
        getchar();
    }
    if(c_TheRequest == 'q'){
        printf("So sad then.Hope you can play with me next time.\n");
        getchar();
    }

    //游戏
    if(c_TheRequest == 's'){
        //输入“数字炸弹”
        system("cls");
        printf("(^ o ^) # *** NOW LET\'S PLAY! *** # (^ o ^)\nAttention!You can only enter numbers in the following steps.\nEnter to start.\n");
        getchar();
        system("cls");
        printf("Game : The number boom!(Another Life.)\n");
        printf("Rule:\n");
        printf("The first player should enter a number.Then he should give to numbers and guarantee the number above is between them.\n");
        printf("The rest should guess and enter the numbers.And the one who enter the exact number the first player entered\n");
        printf("is supported to be the winner!\n");
        printf("Please Enter a number to start the game.(You is ought not to expose it to other players.The number should bigger than 0.)\n");
        printf("__________\b\b\b\b\b\b\b\b\b\b\b");
        while(scanf("%d",&in_GivenNum) != 1 || in_GivenNum < 0){
            system("cls");
            printf("Please Enter a NUMBER which is bigger than 0.\n");
            printf("num:___________\b\b\b\b\b\b\b\b\b\b\b");
            getchar();
        }
        system("cls");
        //判定是否为数字

        //输入“数字炸弹”所在的区间
        printf("And where is the number?Please enter two numbers,and ensure that the number above is between them.\n");
        printf("Additionally,there should be at least 100 numbers between the two numbers you will enter.\n");
        do{
            printf("num = %d\n",in_GivenNum);
            printf("A:__________\b\b\b\b\b\b\b\b\b\b");
            while(scanf("%d",&in_An)!=1){
                printf("Please Enter a NUMBER which is bigger or smaller than the \"num\"!!!!\n");
                printf("A:__________\b\b\b\b\b\b\b\b\b\b");
                scanf("%d",&in_An);
                getchar();
            }
            printf("B:__________\b\b\b\b\b\b\b\b\b\b");
            while(scanf("%d",&in_Bn)!=1){
                printf("Please Enter a NUMBER which is bigger or smaller than the \"num\"!!!!\n");
                printf("B:__________\b\b\b\b\b\b\b\b\b\b");
                scanf("%d",&in_Bn);
                getchar();
            }//记录An和Bn
            if(!(( in_An < in_GivenNum && in_Bn > in_GivenNum ) || ( in_An > in_GivenNum && in_Bn < in_GivenNum ))){
                system("cls");
                printf("Your math is so poor.Enter a again!\nThe \"num\" must be between the two numbers.\n");
                printf("Enter to restart.\n");
                getchar();
                getchar();
                system("cls");
            }//区间如果错误就会报错
        }while(!(( in_An < in_GivenNum && in_Bn > in_GivenNum ) || ( in_An > in_GivenNum && in_Bn < in_GivenNum )));//判定区间是不是对的

        //排序
        if(in_An > in_Bn){
            in_Mid = in_An;
            in_An = in_Bn;
            in_Bn = in_Mid;
        }

        //开始猜数字
        system("cls");
        printf("Now the game starts!\n");
        printf("The number is somewhere between %d and %d\n",in_An,in_Bn);
        printf("Please enter the number.\n");
        printf("__________\b\b\b\b\b\b\b\b\b\b");
        while(in_Deltar != 0){
            while(scanf("%d",&in_EnteredNumber)!=1){
                printf("Please Enter a NUMBER!!!!\n");
                scanf("%d",&in_EnteredNumber);
                getchar();
            }//判断是否为数字

            //差的运算
            in_Deltar = ((in_GivenNum - in_EnteredNumber)<0)?in_EnteredNumber - in_GivenNum:in_GivenNum - in_EnteredNumber;
            in_Sig = in_GivenNum - in_EnteredNumber;
            in_DistantAn = in_GivenNum - in_An;
            in_DistantBn = in_Bn - in_GivenNum;

            //判定差的大小
            if(in_Deltar >= 1000){
                if(in_Sig > 0)
                printf("Too small!Next!\n");
                else
                printf("Too big!Next!\n");
            }
            else if(in_Deltar >= 100){
                if(in_Sig > 0)
                printf("Small.Next!\n");
                else
                printf("Big.Next!\n");
            }
            else if(in_Deltar >= 10){
                if(in_Sig > 0)
                printf("A little small.Next!\n");
                else
                printf("A little big.Next!\n");
            }
            else if(in_Deltar > 0){
                printf("Almost there!NEXT!!!\n");
            }

            //临时存储，以便后面判断所给数字是否满足条件
            in_TemporaryAnSaver = in_An;
            in_TemporaryBnSaver = in_Bn;

            if(( in_Deltar < in_DistantAn && in_Sig > 0 ) || ( in_Deltar < in_DistantBn && in_Sig < 0 )){
                if(in_Sig > 0)
                in_An = in_EnteredNumber;
                else
                in_Bn = in_EnteredNumber;
            }//这是修改上下限
            if((in_TemporaryAnSaver == in_An && in_TemporaryBnSaver == in_Bn) && in_Deltar){
                system("cls");
                printf("Do not cheat!\nYou should play it again.\n");
            }//判定所猜的数字是否在区间内

            if(in_Deltar == 0)
            break;//猜中
            
            printf("Enter to continue.\n");
            getchar();
            getchar();
            system ("cls");
            printf("Between %d and %d\n__________\b\b\b\b\b\b\b\b\b\b",in_An,in_Bn);//区间修正
        }
        printf("You are the one !!!");
        getchar();
        getchar();
    }
}
```

## Go 框架 Gin 的简单运用

### db.json

``` json
{
    "20201234":{
        "email":"20201234@neu.edu",
        "pwd":"20201234"
    },
    "20203302":{
        "email":"20203302@neu.edu",
        "pwd":"20020214"
    },
    "20207710":{
        "email":"20207710@neu.edu",
        "pwd":"20020214"
    }
}
```

### post.json

``` json
{
  "Posts":
  [
    [
      {
        "tag": "test1",
        "description": "This tag is utilized to test data",
        "pNum": 1
      },
      {
        "id": "1",
        "author": "admin",
        "type": "test",
        "title": "Test",
        "content": "<p>this is a test post</p>"
      }
    ],
    [
      {
        "tag": "test2",
        "description": "This tag is utilized to test data",
        "pNum": 1
      },
      {
        "id": "1",
        "author": "admin",
        "type": "test",
        "title": "Test",
        "content": "<p>this is a test post</p>"
      }
    ]
  ],
  "totaltag": 2
}
```

### Source Code

``` go
package main

import (
    "crypto/md5"
    "encoding/json"
    "fmt"
    "io/ioutil"
    "net/http"
    "os"
    "regexp"
    "strconv"

    "github.com/gin-gonic/gin"
)

func getJsonContent(path string) (string, error) {
    jsonFile, err := os.Open(path)
    if err != nil {
        fmt.Println(err)
        return "", nil
    }

    defer func() {
        err = jsonFile.Close()
        if err != nil {
            fmt.Println(err)
        }
    }()

    byteValue, _ := ioutil.ReadAll(jsonFile)

    return string(byteValue), err
}

func getUserNamePassword(path string) map[string]map[string]string {
    byteValue, err := getJsonContent("db.json")
    if err != nil {
        fmt.Println(err)
        return nil
    }

    var unp map[string]map[string]string

    err = json.Unmarshal([]byte(byteValue), &unp)
    if err != nil {
        fmt.Println(err)
        return nil
    }

    return unp
}

func refreshUserNamePassword(path string, unp map[string]map[string]string) error {
    jsonFile, err := os.OpenFile(path, os.O_RDWR, 0666)
    if err != nil {
        fmt.Println(err)
        return err
    }

    defer func() {
        err = jsonFile.Close()
        if err != nil {
            fmt.Println(err)
        }
    }()

    jsonUNP, err := json.Marshal(unp)
    if err != nil {
        fmt.Println(err)
        return err
    }

    _, err = jsonFile.Write(jsonUNP)
    if err != nil {
        fmt.Println(err)
        return err
    }

    return nil
}

func main() {
    router := gin.Default()

    grep, err := regexp.Compile(`.+@.+\.[a-z]+`)

    secureKey := "123"

    text := `
------------------------------------------------------------------------------------------
登录格式:  localhost:8081/v1/usr/login?name=20203302&pwd=20020214
注册格式:  localhost:8081/v1/usr/regin?name=20203302&pwd=20020214&email=1234@1234.com
饼干格式:  localhost:8081/v1/usr/cookie?name=20203302&pwd=20020214&age=123
获取原始内容:
 - localhost:8081/v1/list/get-post
 - localhost:8081/v1/list/get-user
------------------------------------------------------------------------------------------
`
    fmt.Println(text)

    v1 := router.Group("/v1")

    go func() {
        v1.GET("/usr/:action", func(c *gin.Context) {
            action := c.Param("action")
            switch action {

            case "login":
                unp := getUserNamePassword("db.json")
                name := c.Query("name")
                pwd := c.Query("pwd")

                if unp == nil {
                    c.JSON(http.StatusOK, gin.H{
                        "message": "Database No Found",
                    })
                } else if v, ok := unp[name]["pwd"]; ok && v == pwd {
                    md5Inst := md5.New()
                    md5Inst.Write([]byte(name + pwd))
                    c.JSON(http.StatusOK, gin.H{
                        "message": "Right Password",
                        "uuid":    md5Inst.Sum([]byte(secureKey)),
                    })
                } else if ok && v != pwd {
                    c.JSON(http.StatusOK, gin.H{
                        "message": "Wrong Password",
                    })
                } else if !ok {
                    c.JSON(http.StatusOK, gin.H{
                        "message": "Wrong Name",
                    })
                }

            case "regin":
                unp := getUserNamePassword("db.json")
                name := c.Query("name")
                pwd := c.Query("pwd")
                email := c.Query("email")

                if unp == nil {
                    c.JSON(http.StatusOK, gin.H{
                        "message": "Database No Found",
                    })
                } else if err != nil {
                    c.JSON(http.StatusOK, gin.H{
                        "message": "Regular Expression Error",
                    })
                } else if result := grep.FindAllString(email, -1); len(result) == 0 {
                    c.JSON(http.StatusOK, gin.H{
                        "message": "Wrong email",
                    })
                } else if _, ok := unp[name]["pwd"]; ok {
                    c.JSON(http.StatusOK, gin.H{
                        "message": "Name already exist",
                    })
                } else {
                    unp[name] = map[string]string{"pwd": pwd, "email": email}

                    err = refreshUserNamePassword("db.json", unp)
                    if err == nil {
                        md5Inst := md5.New()
                        md5Inst.Write([]byte(name + pwd))
                        c.JSON(http.StatusOK, gin.H{
                            "message": "Registered Successfully",
                            "uuid":    md5Inst.Sum([]byte(secureKey)),
                        })
                    } else {
                        c.JSON(http.StatusOK, gin.H{
                            "message": "Register Fail",
                        })
                    }
                }
            case "cookie":
                name := c.Query("name")
                pwd := c.Query("pwd")
                age := c.Query("age")
                md5Inst := md5.New()
                md5Inst.Write([]byte(name + pwd))
                intAge, err := strconv.Atoi(age)
                if err != nil {
                    fmt.Println(err)
                    c.JSON(http.StatusOK, gin.H{
                        "message": "Wrong Age",
                    })
                }

                c.SetCookie(name, string(md5Inst.Sum([]byte(secureKey))), intAge*60*60*24,
                    "/", "localhost", true, true)

                c.JSON(http.StatusOK, gin.H{
                    "message": "Get Cookie Successfully",
                })
            case "":

            }
        })
    }()

    go func() {
        v1.GET("/list/get-post", func(c *gin.Context) {
            posts, _ := getJsonContent("post.json")
            c.String(http.StatusOK, posts)
        })
    }()

    go func() {
        v1.GET("/list/get-user", func(c *gin.Context) {
            posts, _ := getJsonContent("db.json")
            c.String(http.StatusOK, posts)
        })
    }()

    go func() {
        router.NoRoute(func(c *gin.Context) {
            c.JSON(http.StatusNotFound, gin.H{
                "status": 404,
                "error":  "404, page not exists!",
            })
        })
    }()

    err = router.Run(":8081")

    if err != nil {
        fmt.Println(err)
    }
}
```

## JavaScript 闭包&记忆函数

``` javascript
var g = function () {
    var memo = {"0": false, "1": false, "2":true, "3":true}
    function isPrime(p) {
        if (p < 3) {
            return memo[p]
        } else {
            for (x in memo) {
                if (memo[x] && x * x <= p) {
                    if (p % x == 0) {
                        return false
                    }   
                }
            }
        }
        return (memo[p] = true)
    }
    return {
        "isPrime": isPrime,
        "show": function () {
            console.log(memo)
        }
    }
}()

for (var i = 0; i < 1000; i++) {
    g.isPrime(i)
}

g.show()
```

## Go 关键字 defer 测试

### Test Code 1

``` go
package main

import (
    "fmt"
)

func deferTest1() int {
    c := 10
    defer func() {
        c += 10
        fmt.Printf("Test 1 defer 1: %v\n", c)
    }()
    c += 10
    fmt.Printf("Test 1 in func: %v\n", c)
    defer func() {
        c += 10
        fmt.Printf("Test 1 defer 2: %v\n", c)
    }()
    return c
}

func deferTest2() (c int) {
    c = 10
    defer func() {
        c += 10
        fmt.Printf("Test 2 defer 1: %v\n", c)
    }()
    c += 10
    fmt.Printf("Test 2 in func: %v\n", c)
    defer func() {
        c += 10
        fmt.Printf("Test 2 defer 2: %v\n", c)
    }()
    return c
}

func deferTest3() *int {
    c := 10
    defer func() {
        c += 10
        fmt.Printf("Test 3 defer 1: %v\n", c)
    }()
    c += 10
    fmt.Printf("Test 3 in func: %v\n", c)
    defer func() {
        c += 10
        fmt.Printf("Test 3 defer 2: %v\n", c)
    }()
    return &c
}

func main() {
    fmt.Printf("Test 1 return: %v\tret val not declared in definition\n", deferTest1())
    fmt.Printf("Test 2 return: %v\tret val declared in definition\n", deferTest2())
    fmt.Printf("Test 3 return: %v\tret val is the pointer\n", *deferTest3())
}
```

``` output
Test 1 in func: 20
Test 1 defer 2: 30
Test 1 defer 1: 40
Test 1 return: 20       ret val not declared in definition
Test 2 in func: 20
Test 2 defer 2: 30
Test 2 defer 1: 40
Test 2 return: 40       ret val declared in definition
Test 3 in func: 20
Test 3 defer 2: 30
Test 3 defer 1: 40
Test 3 return: 40       ret val is the pointer
```

### Test Code 2

``` go
package main

import (
    "fmt"
)

func deferTest1() int {
    c := 10
    defer func() {
        c += 10
        fmt.Printf("Test 1 defer 1: %v\n", c)
        defer func() {
            c += 10
        }()
    }()
    c += 10
    fmt.Printf("Test 1 in func: %v\n", c)
    defer func() {
        c += 10
        fmt.Printf("Test 1 defer 2: %v\n", c)
        defer func() {
            c += 10
        }()
    }()
    return c
}

func deferTest2() (c int) {
    c = 10
    defer func() {
        c += 10
        fmt.Printf("Test 2 defer 1: %v\n", c)
        defer func() {
            c += 10
        }()
    }()
    c += 10
    fmt.Printf("Test 2 in func: %v\n", c)
    defer func() {
        c += 10
        fmt.Printf("Test 2 defer 2: %v\n", c)
        defer func() {
            c += 10
        }()
    }()
    return c
}

func deferTest3() *int {
    c := 10
    defer func() {
        c += 10
        fmt.Printf("Test 3 defer 1: %v\n", c)
        defer func() {
            c += 10
        }()
    }()
    c += 10
    fmt.Printf("Test 3 in func: %v\n", c)
    defer func() {
        c += 10
        fmt.Printf("Test 3 defer 2: %v\n", c)
        defer func() {
            c += 10
        }()
    }()
    return &c
}

func main() {
    fmt.Printf("Test 1 return: %v\tret val not declared in definition\n", deferTest1())
    fmt.Printf("Test 2 return: %v\tret val declared in definition\n", deferTest2())
    fmt.Printf("Test 3 return: %v\tret val is the pointer\n", *deferTest3())
}
```

``` ouput
Test 1 in func: 20
Test 1 defer 2: 30
Test 1 defer 1: 50
Test 1 return: 20       ret val not declared in definition
Test 2 in func: 20
Test 2 defer 2: 30
Test 2 defer 1: 50
Test 2 return: 60       ret val declared in definition
Test 3 in func: 20
Test 3 defer 2: 30
Test 3 defer 1: 50
Test 3 return: 60       ret val is the pointer
```
