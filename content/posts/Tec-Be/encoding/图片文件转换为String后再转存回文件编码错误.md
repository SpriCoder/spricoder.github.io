---
title: 图片文件转换为String后再转存回文件编码错误
date: 2024-02-10 11:59:59
description: "在应用场景中，我们需要将图片格式文件转换为String方式存储，然而笔者发现存储后无法正常转存得到原本的文件，本文记载了问题排查与修复过程。"
categories: [编码]
mathjax: false
tags: ["Java","字符编码","二进制数据"]
content_type: practice
---

> 在应用场景中，我们需要将图片格式文件转换为String方式存储，然而笔者发现存储后无法正常转存得到原本的文件，本文记载了问题排查与修复过程。

# 1. 问题代码

话不多说，如下的代码是笔者一开始使用的代码，然而此代码得到的新图片文件**格式错误**。

```java
public class Example {
  private static String readFile(String filename) {
    File file = new File(filename);

    try {
      FileInputStream fis = new FileInputStream(file);
      byte[] data = new byte[(int) file.length()];
      fis.read(data);
      fis.close();
      return new String(data);
    } catch (IOException e) {
      e.printStackTrace();
    }
    return "Failed to read file!";
  }

  private static void writeFile(String bin, String filename) {
    byte[] data = bin.getBytes();
    File file = new File(filename);
    if(file.exists()){
      file.delete();
    }
    FileOutputStream fos = null;
    try {
      fos = new FileOutputStream(file);
      fos.write(data,0,data.length);
      fos.flush();
      fos.close();
    } catch (Exception e) {
      e.printStackTrace();
    }
  }

  public static void main(String[] args) {
    String originFilename = "./test.png";
    String targetFilename = "./result.png";
    String fileStr = readFile(originFilename);
    writeFile(fileStr, targetFilename);
  }
}
```

# 2. 问题定位
很令笔者困惑的一点是，按照此般思路，我们先得到了图片的二进制数组，然后以 String 类型转存，之后再从 String 类型中获取到二进制数组，转存成为文件，不应该出现格式错误。

经过反复思考和查阅资料，笔者意识到可能在 byte[] 数组和 String 类型字符串进行转存过程中出现了**编码替换问题**，从而导致图片的格式被破坏。

## 2.1. String 构造方法
```java
/**
 * Constructs a new {@code String} by decoding the specified array of bytes
 * using the platform's default charset.  The length of the new {@code
 * String} is a function of the charset, and hence may not be equal to the
 * length of the byte array.
 *
 * <p> The behavior of this constructor when the given bytes are not valid
 * in the default charset is unspecified.  The {@link
 * java.nio.charset.CharsetDecoder} class should be used when more control
 * over the decoding process is required.
 *
 * @param  bytes
 *         The bytes to be decoded into characters
 *
 * @since  JDK1.1
 */
public String(byte bytes[]) {
    this(bytes, 0, bytes.length);
}
```

从如上的 String 的构造方法可以看到，在没有设置编码的情况下，会采用**系统默认编码**，对应 MacOS 上也就是 UTF-8 编码。而 UTF-8 编码是**变长编码**，可能是单字节、双字节或者三字节，故而猜测可能是在**编码解码过程中出现问题**。

## 2.2. 解码过程
```java
private StringDecoder(Charset cs, String rcn) {
    this.requestedCharsetName = rcn;
    this.cs = cs;
    this.cd = cs.newDecoder()
        .onMalformedInput(CodingErrorAction.REPLACE)
        .onUnmappableCharacter(CodingErrorAction.REPLACE);
    this.isTrusted = (cs.getClass().getClassLoader0() == null);
}
```

在 String 解码过程中使用到关键的 StringDecoder，从如上 StringDecoder 的构造方法中我们可以看到有 `CodingErrorAction.REPLACE` 参数，该参数的解释是通过丢弃错误输入、将编码器的替换值附加到输出缓冲区并恢复编码操作来处理编码错误的操作。

```java
/**
 * Action indicating that a coding error is to be handled by dropping the
 * erroneous input, appending the coder's replacement value to the output
 * buffer, and resuming the coding operation.
 */
public static final CodingErrorAction REPLACE = new CodingErrorAction("REPLACE");
```

这也就意味着错误的部分，会被替换。当字节数组的编码符合 UTF-8 的时候不会出现问题，反之则会被替换修正，从而最终导致转存回的图片文件出现格式错误。

# 3. 解决方案
根据上文的分析，我们可以确定该问题是编码的问题，我们可以通过使用**单字节编码模式**（如ISO_8859_1等）解决该问题，修改后的代码如下：

```java
public class Example {
  /** 使用单字节编码模式 **/
  private static final Charset charset = StandardCharsets.ISO_8859_1;
  private static String readFile(String filename) {
    File file = new File(filename);

    try {
      FileInputStream fis = new FileInputStream(file);
      byte[] data = new byte[(int) file.length()];
      fis.read(data);
      fis.close();
      return new String(data, charset);
    } catch (IOException e) {
      e.printStackTrace();
    }
    return "Failed to read file!";
  }

  private static void writeFile(String bin, String filename) {
    byte[] data = bin.getBytes(charset);
    File file = new File(filename);
    if(file.exists()){
      file.delete();
    }
    FileOutputStream fos = null;
    try {
      fos = new FileOutputStream(file);
      fos.write(data,0,data.length);
      fos.flush();
      fos.close();
    } catch (Exception e) {
      e.printStackTrace();
    }
  }

  public static void main(String[] args) {
    String originFilename = "./test.png";
    String targetFilename = "./result.png";
    String fileStr = readFile(originFilename);
    writeFile(fileStr, targetFilename);
  }
}
```

# 4. 参考博客
https://www.codeboy.me/2021/03/23/java-string-bytes/