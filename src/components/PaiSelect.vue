<template>
  <img :src='require("../assets/"+name+".webp")' :class='{horiz:name[0]=="H"}'/>
</template>

<script>

  export default{
    name:"PaiSelect",
    props:{
      name:String
    },
  }
</script>

<style scoped>
  @media screen and (min-width: 800px) {
    img{
      height: 6.25rem ;
      display:block;
      cursor: pointer;
    }

    .horiz{
      width: 6.25rem;
      height: auto;
    }
  }
  @media screen and (max-width: 799px) {
    img{
      height: 3.5rem ;
      display:block;
      cursor: pointer;
    }

    .horiz{
      width: 3.5rem;
      height: auto;
    }
  }

  /* 强制覆盖历史记录面板中的牌尺寸 */
  .history-panel img {
    height: 2.5rem !important;
  }
  .history-panel img.horiz {
    width: 2.5rem !important;
    height: auto !important;
  }

  .disabled{
    cursor:not-allowed;
    opacity: 0.5;
  }
</style>