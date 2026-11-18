<template>
  <div id="root">
    <header>
      <n-space>
        <router-link class="nav" to="/calculator">计算器</router-link>
        <div class="nav">|</div>
        <router-link class="nav" to="/practice">点数练习</router-link>
      </n-space>

      <n-space justify="end" id="nav-buttons">
        <n-icon size="2rem" role="button" tabindex="0" aria-label="关于" @click="showInfo=!showInfo" @keydown.enter="showInfo=!showInfo" @keydown.space.prevent="showInfo=!showInfo" color="#333">
          <InfoRound/>
        </n-icon>
        <n-icon size="2rem" @click="showSetting=!showSetting" color="#333">
          <SettingsRound/>
        </n-icon>
      </n-space>
    </header>
    
    <div id="content">
      <router-view :rule="rule"/>
    </div>

    <footer>
      <div>原作 ©2022-2023 <a href="https://linlexiao.com/">linlexiao.com</a> · 二次开发 <a href="https://github.com/MichaelFW-ui/mahjong-vue">MichaelFW-ui</a></div>
    </footer>

    <!-- 设置修改框  -->
    <n-modal
      v-model:show="showSetting"
      class="custom-card"
      preset="card"
      :style="{width:'37.5rem'}"
      title="自定义设置"
      :bordered="false"
      @after-leave="updateData"
    >
      <n-grid :cols="2" :y-gap="3">
        <n-grid-item>食断：</n-grid-item>
        <n-grid-item>
          <n-radio-group v-model:value="rule.shiDuan">
            <n-radio-button
              v-for="o in settings[0]" :key="o.value"
              :value="o.value"
              :label="o.label"
            />
          </n-radio-group>
        </n-grid-item>
        
        <n-grid-item>多倍役满：</n-grid-item>
        <n-grid-item>
          <n-radio-group v-model:value="rule.duoBeiYiMan">
          <n-radio-button
            v-for="o in settings[0]" :key="o.value"
            :value="o.value"
            :label="o.label"
          />
          </n-radio-group>
        </n-grid-item>

        <n-grid-item>复合役满：</n-grid-item> 
        <n-grid-item>
          <n-radio-group v-model:value="rule.fuHeYiMan">
          <n-radio-button
            v-for="o in settings[0]" :key="o.value"
            :value="o.value"
            :label="o.label"
          />
          </n-radio-group>
        </n-grid-item>
        <n-grid-item>连风雀头：</n-grid-item>
        <n-grid-item>
          <n-radio-group v-model:value="rule.lianFeng4">
          <n-radio-button
            v-for="o in settings[1]" :key="o.value"
            :value="o.value"
            :label="o.label"
          />
          </n-radio-group>
        </n-grid-item>

        <n-grid-item>13翻及以上：</n-grid-item> 
        <n-grid-item>
          <n-radio-group v-model:value="rule.allowLeiMan">
          <n-radio-button
            v-for="o in settings[2]" :key="o.value"
            :value="o.value"
            :label="o.label"
          />
        </n-radio-group>
        </n-grid-item>
      </n-grid>
    </n-modal>

    
    <!-- 信息框  -->
    <n-modal
      v-model:show="showInfo"
      class="custom-card"
      preset="card"
      :style="{width:'37.5rem'}"
      title="关于"
      :bordered="false"
    >

      <div class="about-content">
        <p>基于 <a :href="buildInfo.upstreamRepository" target="_blank" rel="noopener noreferrer">llx07 的日麻工具</a>二次开发，增加了练习历史记录和错题复习功能。</p>
        <p>原作者：<a href="https://github.com/llx07" target="_blank" rel="noopener noreferrer">linlexiao（llx07）</a>。上游版本：<a :href="buildInfo.upstreamUrl" target="_blank" rel="noopener noreferrer">{{ buildInfo.upstreamCommit.slice(0, 7) }}（{{ buildInfo.upstreamDate }}）</a>。</p>
        <p>当前版本：v{{ buildInfo.version }} · <a :href="buildInfo.sourceUrl" target="_blank" rel="noopener noreferrer">{{ buildInfo.commit.slice(0, 7) }}</a>，修改日期：{{ buildInfo.modifiedDate }}。</p>
        <p>程序采用 <a :href="baseUrl + 'licenses/GPL-3.0.txt'" target="_blank" rel="noopener noreferrer">GNU GPL v3</a> 协议发布。<a :href="buildInfo.sourceUrl" target="_blank" rel="noopener noreferrer">版本源码</a> · <a :href="baseUrl + 'source.tar.gz'" download>下载源码</a>。</p>
        <p>牌画素材来自 <a href="https://github.com/lietxia/mahjong_graphic" target="_blank" rel="noopener noreferrer">lietxia/mahjong_graphic</a>，采用 <a :href="baseUrl + 'licenses/MPlus.txt'" target="_blank" rel="noopener noreferrer">M+ 字型授权条款</a>。<a :href="baseUrl + 'licenses/THIRD_PARTY_NOTICES.txt'" target="_blank" rel="noopener noreferrer">素材与依赖说明</a>。</p>
      </div>

    </n-modal>

  </div>
</template>

<script>
  import buildInfo from './build-info.json'
  import { Rule } from './store/definition'
  import { NModal,NRadioGroup,NRadioButton, NGrid, NGridItem, NIcon, NSpace} from 'naive-ui'
  import { SettingsRound,InfoRound } from '@vicons/material'

  export default{
    name:"App",
    data(){
      return {
        buildInfo,
        baseUrl: process.env.BASE_URL,
        rule:new Rule(),
        showSetting:false,
        showInfo:false,


        settings:[
          [{value:1,label:"有"},{value:0,label:"无"}],
          [{value:0,label:"2符"},{value:1,label:"4符"}],
          [{value:1,label:"累计役满"},{value:0,label:"三倍满"}],
        ],
      }
    },
    components: {
      NModal,NRadioGroup,NRadioButton,NGrid, NGridItem,NIcon,NSpace,
      SettingsRound,InfoRound
    },
    created(){
      if(localStorage.getItem('rule')!=null){
        this.rule = JSON.parse(localStorage.getItem('rule'))
      }
    },
    methods:{
      updateData(){
        localStorage.setItem('rule',JSON.stringify(this.rule))
      }
    }
  }
</script>

<style scoped>
  
  .about-content { line-height: 1.8; overflow-wrap: anywhere; }

  #bk{
    margin-left: 3.75rem;
  }

  #root{
    --nav-height: 2.5rem  ;
    --nav-padding: 0.25rem  ;
  }
  

  header,footer{
    z-index: 5;
  }

  header{
    height: var(--nav-height);
    text-align: center;
    position: fixed;
    width: calc(100% - 2.4rem);
    top: 0;
    left:0;
    display: flex;
    padding: var(--nav-padding) 1.2rem;
  }

  footer {
    position: fixed ;
    bottom: 0;
    left:0;
    width: 100%;
    padding: 0;
    margin: 0;
    height: 2rem;
    text-align: center;
    align-content: center;
    justify-content: center;
    align-items:center;
    display:flex;
    flex-direction:column;
}

  .nav {
    height:var(--nav-height);
    line-height: var(--nav-height);
    text-align: center;
    font-size: 1.5rem;
  }

  a.nav  {
    font-weight: bold;
    color: #2c3e50;
  }
  #nav-buttons{
    flex-grow: 1;
  }
  
  #nav-buttons svg{
    cursor: pointer;
  }
  a.nav.router-link-exact-active {
    color: #42b983;
  }
  .flex{
    flex: auto;
  }

  #content{
    padding-top: var(--nav-height);
    padding-bottom: 2rem;
    padding-left: 2px;
    padding-right: 2px;
  }


  #modal::before{
    content: "";
    background-color: rgba(0,0,0,0.5);
    z-index: 10;
    position: absolute;
    top:0;
    left:0;
    width:100%;
    height: 100%;
  }
</style>
