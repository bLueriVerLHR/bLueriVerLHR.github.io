---
title: "man Git"
description: "Tips, techniques for Git."
authors: ["bLueriVerLHR"]
date: 2024-09-22T13:11:48+08:00
draft: false
tags: ["git", "manuel"]
toc: true
---

## clear local cache

Sometimes we need to clear local cache to activate `.gitignore` or `.gitmodules` rules.

``` bash
git rm -r --cached .
```

## clone with submodules

Use `--recurse-submodules` to clone submodules and `-j4` to clone then while cloning the main repo.

``` bash
git clone --recurse-submodules -j4 git@github.com:<repo-name>.git
```

## set user info

Need to be set before commit.

``` bash
git config --global user.name "Your Nickname"
git config --global user.email your_email@example.com
```

## gen new ssh-key and add to github

Use `ssh-keygen` to generate a new ssh-key. The `ALGORITHM` could be `ed25519` or `rsa`. (`ed25519` is better)

``` bash
ssh-keygen -t ALGORITHM -C "your_email@example.com"
# ssh-keygen -t ed25519 -C "your_email@example.com"

# > Enter file in which to save the key (~/.ssh/id_ALGORITHM):[Press enter]
# > Enter passphrase (empty for no passphrase): [Type a passphrase]
# > Enter same passphrase again: [Type passphrase again]
```

Then copy the ssh pub key to your clipboard.

``` bash
cat ~/.ssh/id_ALGORITHM.pub
# cat ~/.ssh/id_ed25519.pub

# Then select and copy the contents of the id_ALGORITHM.pub file
# displayed in the terminal to your clipboard
```

- After that, click `Settings` of your github page.
- Find `SSH and GPG keys`.
- Click `New SSH key` or `Add SSH key`.
- In the "Title" field, add a descriptive label for the new key.
  - For example, if you're using a personal laptop, you might call this key "Personal laptop".
- Select the type of key, either authentication or signing.
- In the "Key" field, paste your public key.
- Click `Add SSH key`.